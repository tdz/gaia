/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[PlayerView]', ...args) : () => {};

const REPEAT_VALUES = ['off', 'list', 'song'];
const SHUFFLE_VALUES = ['off', 'on'];

var PlayerView = View.extend(function PlayerView() {
  View.call(this); // super();

  this.artwork = document.getElementById('artwork');
  this.controls = document.getElementById('controls');
  this.seekBar = document.getElementById('seek-bar');

  this.artwork.addEventListener('share', () => this.share());
  this.artwork.addEventListener('repeat', () => this.setRepeatSetting(this.artwork.repeat));
  this.artwork.addEventListener('shuffle', () => this.setShuffleSetting(this.artwork.shuffle));
  this.artwork.addEventListener('ratingchange', evt => this.setSongRating(evt.detail));

  this.controls.addEventListener('play', () => this.play());
  this.controls.addEventListener('pause', () => this.pause());
  this.controls.addEventListener('previous', () => this.previous());
  this.controls.addEventListener('next', () => this.next());

  this.seekBar.addEventListener('seek', evt => this.seek(evt.detail.elapsedTime));

  this.client.on('play', () => this.controls.paused = false);
  this.client.on('pause', () => this.controls.paused = true);
  this.client.on('songChange', () => this.update());
  this.client.on('durationChange', duration => this.seekBar.duration = duration);
  this.client.on('elapsedTimeChange', elapsedTime => this.seekBar.elapsedTime = elapsedTime);

  this.getRepeatSetting().then(repeat => this.artwork.repeat = repeat);
  this.getShuffleSetting().then(shuffle => this.artwork.shuffle = shuffle);

  this.update();
});

PlayerView.prototype.update = function() {
  this.getPlaybackStatus().then((status) => {
    this.getSong(status.filePath).then((song) => {
      if (!song) {
        return;
      }

      this.artwork.artist = song.metadata.artist;
      this.artwork.album = song.metadata.album;
      this.artwork.els.rating.value = song.metadata.rated;

      window.parent.setHeaderTitle(song.metadata.title);
    });

    this.getSongArtwork(status.filePath)
      .then(blob => this.artwork.src = URL.createObjectURL(blob));

    this.controls.paused = status.paused;
    this.seekBar.duration = status.duration;
    this.seekBar.elapsedTime = status.elapsedTime;
    this.render();
  });
};

PlayerView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlayerView.prototype.title = function() {
  return this.getPlaybackStatus()
    .then(status => this.getSong(status.filePath))
    .then(song => song ? song.metadata.title : '');
};

PlayerView.prototype.render = function() {
  View.prototype.render.call(this); // super();
};

PlayerView.prototype.seek = function(time) {
  this.fetch('/api/audio/seek/' + time);
};

PlayerView.prototype.play = function() {
  this.fetch('/api/audio/play');
};

PlayerView.prototype.pause = function() {
  this.fetch('/api/audio/pause');
};

PlayerView.prototype.previous = function() {
  this.fetch('/api/queue/previous');
};

PlayerView.prototype.next = function() {
  this.fetch('/api/queue/next');
};

PlayerView.prototype.share = function() {
  this.getPlaybackStatus().then((status) => {
    this.fetch('/api/activities/share/' + status.filePath);
  });
};

PlayerView.prototype.getPlaybackStatus = function() {
  return this.fetch('/api/audio/status').then(response => response.json());
};

PlayerView.prototype.getRepeatSetting = function() {
  return this.fetch('/api/queue/repeat')
    .then(response => response.json())
    .then(index => REPEAT_VALUES[index]);
};

PlayerView.prototype.setRepeatSetting = function(repeat) {
  this.fetch('/api/queue/repeat/' + REPEAT_VALUES.indexOf(repeat));
};

PlayerView.prototype.getShuffleSetting = function() {
  return this.fetch('/api/queue/shuffle')
    .then(response => response.json())
    .then(index => SHUFFLE_VALUES[index]);
};

PlayerView.prototype.setShuffleSetting = function(shuffle) {
  this.fetch('/api/queue/shuffle/' + SHUFFLE_VALUES.indexOf(shuffle));
};

PlayerView.prototype.setSongRating = function(rating) {
  this.getPlaybackStatus()
    .then(status => this.fetch('/api/songs/rating/' + rating + '/' + status.filePath));
};

PlayerView.prototype.getSong = function(filePath) {
  return this.fetch('/api/songs/info/' + filePath).then(response => response.json());
};

PlayerView.prototype.getSongArtwork = function(filePath) {
  return this.fetch('/api/artwork/original/' + filePath).then(response => response.blob());
};

window.view = new PlayerView();
