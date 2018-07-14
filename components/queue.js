var Helper = require('./helper.js');

var exports = {};

module.exports = Queue = function() {
  var vm = this;

  vm.skipVotes = [];
  vm.queue = [];
  vm.currentDispatcher = undefined;

  Helper.keys('queue', ['maxlen', 'skipmajority']).then(values => {
    vm.maxlen = values.maxlen;
    vm.skipmajority = values.skipmajority;
    vm.admins = ['234272258934308864'];
  }).catch(err => {
    console.log(err);
    vm.hasUnmetDepedencies = true;
  });
}

Queue.prototype.add = function(track, message) {
  this.queue.push(track);

  message.reply(Helper.wrap(track.title + '를 추가하였습니다. (number ' + (this.queue.indexOf(track) + 1) + ')'));

  if (this.queue.length == 1) {
    this.play(message);
  }
}

Queue.prototype.isFull = function() {
  return this.queue.length >= this.maxlen;
}

Queue.prototype.play = function(message) {
  var vm = this;
  var channel = getAuthorVoiceChannel(message);

  if (!channel) {
    vm.queue = [];
    return message.reply(Helper.wrap('보이스채널에 들어가주세요.'));
  }

  var toPlay = vm.queue[0];
  if (!toPlay) {
    return message.reply(Helper.wrap('신청된 노래가 없습니다.'));
  }

  channel.join().then(connection => {
    var stream = toPlay.stream();

    vm.currentDispatcher = connection.playStream(stream, {
      seek: 0,
      volume: 0.5
    });

    vm.currentDispatcher.on('end', event => {
      vm.remove(message);
    });

    vm.currentDispatcher.on('error', err => {
      vm.remove(message);
    });

    vm.skipVotes = [];
    message.channel.sendMessage(Helper.wrap('현곡은: ' + toPlay.title));
  }).catch(console.error);
}

Queue.prototype.showSong = function(message) {
  var song = this.queue[0];

  if (song) {
    return message.reply(Helper.wrap('현곡: ' + song.title + '\n' + song.url));
  } else {
    return message.reply(Helper.wrap('노래가 나오고있지 않습니다.'));
  }
}

Queue.prototype.voteSkip = function(message) {
  var vm = this;
  var channel = getAuthorVoiceChannel(message);

  if (!vm.currentDispatcher) {
    return message.reply(Helper.wrap('노래가 나오고있지 않습니다.'));
  }

  if (vm.admins.includes(message.member.user.id)) {
    this.currentDispatcher.end();
    return message.reply(Helper.wrap('Of course sir.'));
  }

  if (!channel) {
    return message.reply(Helper.wrap("음성채널에 없으므로 노래스킵이 불가능합니다"));
  }

  if (vm.skipVotes.indexOf(message.author.id) > -1) {
    return message.reply(Helper.wrap('이미 이 노래를 건너 뛰기로 투표했습니다.'));
  }

  vm.skipVotes.push(message.author.id);

  var totalMembers = Helper.getTotalMembers(channel);

  if (vm.skipVotes.length / totalMembers >= vm.skipmajority) {
    this.currentDispatcher.end();
  } else {
    var votesNeeded = getAmountOfVotesNeeded(totalMembers, vm.skipVotes.length, vm.skipmajority);
    return message.reply(Helper.wrap('이 노래를 건너 뛰려면 '+ votesNeeded +'이상의 투표가 필요합니다.'));
  }
}

Queue.prototype.remove = function(message) {
  this.queue.shift();

  if (this.queue.length > 0) {
    this.play(message);
  } else {
    message.channel.sendMessage(Helper.wrap('대기열에 더 이상 노래가 없습니다.'));
  }
}

function getAmountOfVotesNeeded(members, skipVotes, skipMajority) {
  var needed = 0;
  var skips = skipVotes;

  for (var i = 0; i < members; i++) {
    if (skips / members < skipMajority) {
      skips++;
      needed++;
    }
  }

  return needed;
}

function getAuthorVoiceChannel(message) {
	var voiceChannelArray = message.guild.channels.filter((v) => v.type == 'voice').filter((v) => v.members.exists('id', message.author.id)).array();

	if(voiceChannelArray.length <= 0) {
    return undefined;
  }

	return voiceChannelArray[0];
}
