var Discord = require('discord.js');
var Bot = new Discord.Client();
var Helper = require('./components/helper.js');
var Queue = require('./components/queue.js');
var TrackHelper = require('./components/trackhelper.js');
var WordService = require('./components/wordservice.js');
var WeatherService = require('./components/weatherservice.js');

var commands = {
  '!동영상': {
    execute: getVideo,
    description: '당신이 원하는 영상을 봇이 찾아줍니다!'
  },
  '!계절': {
    execute: getWeather,
    description: '아직 수정중인 명령어입니다'
  },
  '!도움말': {
    execute: showHelp
  },
  '!노래신청': {
    execute: doQueue,
    description: '노래를 신청합니다.'
  },
  '!스킵': {
    execute: voteSkip,
    description: '스킵에 대한 투표를 합니다.'
  }
};

Bot.on('message', message => {
  WordService.registerMessage(message);

  if (isBotCommand(message)) {
    execute(message.content, message);
  }
});

function showSong(args, message) {
  Queue.showSong(message);
}

function voteSkip(args, message) {
  Queue.voteSkip(message);
}

function doQueue(args, message) {
  if (args.length <= 0) {
    return message.reply(Helper.wrap('정확히 노래를 적어주세요.'));
  }

  if (Queue.isFull()) {
    return message.reply(Helper.wrap('노래가 너무많이 신청되었습니다!'));
  }

  if (args.startsWith('http')) {
    TrackHelper.getVideoFromUrl(args).then(track => {
      Queue.add(track, message);
    }).catch(err => {
      message.reply(Helper.wrap(err));
    });
  } else {
    TrackHelper.getRandomTrack(args, 5).then(track => {
      Queue.add(track, message);
    }).catch(err => {
      message.reply(Helper.wrap(err));
    });
  }
}

function getVideo(args, message) {
  TrackHelper.getRandomTrack(args, 5).then(track => {
    message.reply(track.url);
  }).catch(err => {
    message.reply(Helper.wrap(err));
  });
}

function countWordsByUser(args, message) {
  WordService.countWordsByUser(args, message);
}

function getWeather(args, message) {
  WeatherService.getWeather(args, message);
}

function showHelp(args, message) {
  var toReturn = 'No commands to run!';
  if (Object.keys(commands).length > 1) {
    var toReturn = 'Available commands:\n';
    for (var command in commands) {
      if (command != '!help') {
        data = commands[command];
        toReturn += command + ': ' + data.description + getAvailableCommandAsText(data) + '\n';
      }
    }
  }
  message.reply(Helper.wrap(toReturn));
}

function getAvailableCommandAsText(command) {
  if (!Helper.commandIsAvailable(command)) return ' (not available)';

  return '';
}

function roll(content, message) {
  message.reply(Helper.wrap('You rolled ' + getRandomNumber(1, 100) + ' (1-100)'));
}

function isBotCommand(message) {
  if (message.content.startsWith('!') && message.author.id != Bot.user.id) {
    return true;
  }

  return false;
}

function execute(content, message) {
  var args = content.split(" ");
  var command = commands[args[0]];
  if (command) executeCommand(command, message, args);
}

function executeCommand(command, message, args) {
  if (!Helper.commandIsAvailable(command)) {
    return message.reply(Helper.wrap('명령을 사용할 수 없습니다.'));
  }

  command.execute(getCommandArguments(args), message);
}

function getCommandArguments(args) {
  var withoutCommand = args.slice(1);

  return withoutCommand.join(" ");
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function registerService(service, affectedCommands) {
  service = new service();

  if (affectedCommands) {
    affectedCommands.forEach(command => {
      var c = commands[command];
      if (c) {
        if (!c.services) c.services = [];
        c.services.push(service);
      }
    });
  }

  return service;
}

function init() {
  Helper.keys('apikeys', ['discord']).then(keys => {
    Bot.login(keys.discord);

    Queue = registerService(Queue, ['!queue', '!voteskip', '!song']);
    TrackHelper = registerService(TrackHelper, ['!queue', '!video']);
    WordService = registerService(WordService, ['!words']);
    WeatherService = registerService(WeatherService, ['!weather']);
  }).catch(console.error);
}

init();
