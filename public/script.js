const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const myPeer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: location.protocol === 'https:' ? '443' : (location.port || '3030')
});

let myVideoStream;
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

const userName = (prompt('Enter your name') || '').trim() || `Guest-${Math.floor(Math.random()*1000)}`;

// leave meeting
const leaveBtn = document.querySelector('.leave_meeting');
if (leaveBtn) {
  leaveBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => addVideoStream(video, userVideoStream));
  });

  socket.on('user-connected', ({ userId, name }) => {
    connectToNewUser(userId, stream);
    appendSystemMessage(`${name} joined the meeting`);
  });

  // chat input fix
  const input = $('#chat_message');
  input.off('keydown').on('keydown', function(e) {
    if (e.which === 13 && input.val().trim().length !== 0) {
      const msg = {
        user: userName,
        text: input.val().trim()
      };
      socket.emit('message', msg);
      input.val('');
    }
  });

  socket.on('createMessage', data => {
    appendChatMessage(data.user, data.text);
    scrollToBottom();
  });

  socket.on('system-message', text => {
    appendSystemMessage(text);
    scrollToBottom();
  });
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id, userName);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => addVideoStream(video, userVideoStream));
  call.on('close', () => video.remove());
  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => video.play());
  videoGrid.append(video);
}

const scrollToBottom = () => {
  const d = $('.main__chat_window');
  d.scrollTop(d.prop('scrollHeight'));
};

window.muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  myVideoStream.getAudioTracks()[0].enabled = !enabled;
  setMuteUI(!enabled);
};

window.playStop = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  myVideoStream.getVideoTracks()[0].enabled = !enabled;
  setVideoUI(!enabled);
};

function setMuteUI(isOn) {
  document.querySelector('.main__mute_button').innerHTML = isOn
    ? `<i class="fas fa-microphone"></i><span>Mute</span>`
    : `<i class="unmute fas fa-microphone-slash"></i><span>Unmute</span>`;
}

function setVideoUI(isOn) {
  document.querySelector('.main__video_button').innerHTML = isOn
    ? `<i class="fas fa-video"></i><span>Stop Video</span>`
    : `<i class="stop fas fa-video-slash"></i><span>Play Video</span>`;
}

// chat helpers
function appendChatMessage(user, text) {
  const mine = user === userName;
  $('ul.messages').append(
    `<li class="message ${mine ? 'mine' : ''}">
       <b>${escapeHtml(user)}</b><br/>
       ${escapeHtml(text)}
     </li>`
  );
}

function appendSystemMessage(text) {
  $('ul.messages').append(
    `<li class="message system">${escapeHtml(text)}</li>`
  );
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;","}":"&gt;","\"":"&quot;","'":"&#039;"}[s]));
}

// emoji picker
const emojiBar = document.getElementById('emoji-bar');
if (emojiBar) {
  emojiBar.querySelectorAll('button[data-emoji]').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      const input = document.getElementById('chat_message');
      input.value += emoji;
      input.focus();
    });
  });
}
