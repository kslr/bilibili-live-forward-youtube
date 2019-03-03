const program = require('commander');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const log = require('log');
const lockFile = require('lockfile');

ffmpeg.setFfmpegPath(require('ffmpeg-static').path);

program
  .version('0.1.0', '-v, --version')
  .option('-r, --room <n>', 'live room id', parseInt)
  .option('-y, --youtube', 'youubt rtmp id')
  .parse(process.argv);

if (typeof program.room === 'undefined' || typeof program.youtube === 'undefined') {
  log('No command given');
  process.exit(1);
}

function check() {
  axios.get(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${program.room}`)
    .then((roomStatusResponse) => {
      if (roomStatusResponse.data.data.live_status === 1) {
        log('start forward');
        axios.get(`https://api.live.bilibili.com/api/playurl?cid=${program.room}&otype=json&quality=0&platform=web`)
          .then((roomStreamResponse) => {
            const liveStream = roomStreamResponse.data.durl[0].url;

            const command = ffmpeg(encodeURI(liveStream))
              .inputOptions([
                '-c:v copy',
                '-c:a copy',
              ])
              .format('flv')
              .output(program.youtube)
              .on('start', () => {
                lockFile.lock('ffmpeg.lock');
              })
              .on('error', (err) => {
                command.kill();
                lockFile.unlock('ffmpeg.lock');
                log(`An error occurred: ${err.message}`);
              })
              .run();
          });
      } else {
        log(`sleep ${new Date()}`);
      }
    });
}

// ffmpeg -i "https://js.live-play.acgvideo.com/live-js/264726/live_2853854_4212944.flv?wsSecret=ee2096089d13ca9803cb3b2fe8a9e422&wsTime=1551590681&trid=1da5041fb5b5454dac5c07fb1a02ca7d&sig=no" -c:v copy -c:a copy -f flv "rtmp://a.rtmp.youtube.com/live2/fx8e-5y4s-27j2-9jg7"

setInterval(check(), 5 * 60 * 1000);
