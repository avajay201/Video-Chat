function main(selfPeer){
    document.getElementById('main').style.display = 'block';
    document.getElementById('action').style.display = 'none';
    const mapPeers = {};

    // creating websokcet url
    let host = window.location.host;
    let protocol = window.location.protocol;
    let websocket_protocol = protocol === 'https:' ? 'wss://' : 'ws://';
    let socket_url = websocket_protocol + host + '/ws/video_call/hello/';


    // using webcam
    let selfStream = new MediaStream();
    const constraints = {
        'video': true,
        'audio': true
    };
    const selfVideo = document.getElementById('self-user');
    setTimeout(()=>{
        selfVideo.style.display = 'block';
        document.getElementById('self-loader').style.display = 'none';
        document.getElementById('self-username').textContent = 'You';
    }, 3000);
    const userMedia = navigator.mediaDevices.getUserMedia(constraints)
                        .then((stream) => {
                            selfStream = stream;
                            selfVideo.srcObject = selfStream;
                            selfVideo.muted = true;
                        })
                        .catch(error=>{
                            alert('Camera access failed.');
                            window.location.href = '/';
                        });

    function connectToPeer(){
        // creating websocket connection
        const websocket = new WebSocket(socket_url);
        websocket.onopen = function (event) {
            // console.log('WebSocket connected');
            sendSignal('new-peer', {});
            clearInterval(connectionInterval);
        }
        websocket.onmessage = function (event) {
            let parsedData = JSON.parse(event.data);
            console.log('Message recieved -', parsedData);
    
            let peerUser = parsedData['peer'];
            let action = parsedData['action'];
            if (selfPeer === peerUser){
                // if self signal return
                return;
            }
            let receiver_channel_name = parsedData['message']['receiver_channel_name'];
            if (action === 'new-peer'){
                createOffer(peerUser, receiver_channel_name);
            }
            else if (action === 'new-offer'){
                let offer = parsedData['message']['sdp'];
                createAnswer(offer, peerUser, receiver_channel_name);
            }
            else if (action === 'new-answer'){
                let answer = parsedData['message']['sdp'];
                let peer = mapPeers[peerUser][0];
                peer.setRemoteDescription(answer);
            }
    
        }
        websocket.onclose = function (event) {
            // console.log('WebSocket disconnected');
        }
        websocket.onerror = function (event) {
            // console.log('WebSocket error occurred.');
        }

        // // using webcam
        // let selfStream = new MediaStream();
        // const constraints = {
        //     'video': true,
        //     'audio': true
        // };
        // const selfVideo = document.getElementById('self-user');
        // setTimeout(()=>{
        //     selfVideo.style.display = 'block';
        //     document.getElementById('self-loader').style.display = 'none';
        //     document.getElementById('self-username').textContent = 'You';
        // }, 2000);
        // const userMedia = navigator.mediaDevices.getUserMedia(constraints)
        //                     .then((stream) => {
        //                         selfStream = stream;
        //                         selfVideo.srcObject = selfStream;
        //                         selfVideo.muted = true;
        //                     })
        //                     .catch(error=>{
        //                         alert('Camera access failed.');
        //                         window.location.href = '/';
        //                     });
    
        // send signal to server
        function sendSignal(action, message){
            let signal = JSON.stringify({
                'peer': selfPeer,
                'action': action,
                'message': message,
            });
            websocket.send(signal);
        }
    
        // create connection with new peer
        function createOffer(peerUsername, receiver_channel_name){
            let peer = new RTCPeerConnection(null);
            addLocalTracks(peer);
            let dc = peer.createDataChannel('channel')
            dc.addEventListener('open', ()=>{
                // console.log('Connection opened');
            });
    
            // handle chat message
            // dc.addEventListener('message', dcOnMessage);
    
            // peerUser stream
            // let peerUserStream = createPeerStream(peerUser);
            setOnTrack(peer, peerUsername);
    
            // store connected peers
            mapPeers[peerUsername] = [peer, dc];
    
            peer.addEventListener('iceconnectionstatechange', ()=>{
                let iceConnectionState = peer.iceConnectionState;
                console.log('iceConnectionState>>', iceConnectionState);
                if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
                    // close remote peer stream
                    delete mapPeers[peerUsername];
                    // if (iceConnectionState !== 'closed'){
                    peer.close();
                    // }
                    document.getElementById('other-user').style.display = 'none';
                    document.getElementById('other-loader').style.display = 'block';
                    document.getElementById('other-username').textContent = 'Finding...';
                }
            });
    
            peer.addEventListener('icecandidate', (event)=>{
                if (event.candidate){
                    // console.log('New ice candidate: ', JSON.stringify(peer.localDescription))
                    return;
                };
                sendSignal('new-offer', {
                    'sdp': peer.localDescription,
                    'receiver_channel_name': receiver_channel_name
                })
            });
    
            peer.createOffer()
                .then(o=> peer.setLocalDescription(o))
                .then(()=>{
                    // console.log('Local desccription set successfully.');
                });
            
        }
    
        // track self stream
        function addLocalTracks(peer){
            selfStream.getTracks().forEach(track=>{
                peer.addTrack(track, selfStream);
            })
        }
    
        // chat messages
        function dcOnMessage(event){
            let message = event.data;
            // comming soon...
        }
    
        // creating peer user stream
        // function createPeerStream(){
        //     let remotePeer = document.getElementById('other-user');
        //     remotePeer.playsinline = true;
        // }
    
        // set on track remote peer stream
        function setOnTrack(peer, peerUsername){
            console.log('peer>>', peer);
            let peerStream = document.getElementById('other-user');
            let remoteStream = new MediaStream();
            peerStream.srcObject = remoteStream;
            console.log('Remote peering...');
            peer.addEventListener('track', async(event)=>{
                console.log('tracking remote peer...')
                remoteStream.addTrack(event.track, remoteStream);
            });
            document.getElementById('other-username').textContent = peerUsername;
            document.getElementById('other-loader').style.display = 'none';
            peerStream.style.display = 'block';
            // clearInterval(connectionInterval);
        };

        // create answer
        function createAnswer(offer, peerUsername, receiver_channel_name){
            let peer = new RTCPeerConnection(null);
    
            addLocalTracks(peer);
    
            setOnTrack(peer, peerUsername);
    
            peer.addEventListener('datachannel', e=>{
                peer.dc = e.channel;
                peer.dc.addEventListener('open', ()=>{
                    // console.log('Connection opened');
                });
                // handle chat message
                peer.dc.addEventListener('message', dcOnMessage);
                // store connected peers
                mapPeers[peerUsername] = [peer, peer.dc];
            })
    
            peer.addEventListener('iceconnectionstatechange', ()=>{
                let iceConnectionState = peer.iceConnectionState;
                console.log('iceConnectionState>>', iceConnectionState);
                if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
                    // close remote peer stream
                    delete mapPeers[peerUsername];
                    // if (iceConnectionState !== 'closed'){
                    peer.close();
                    // }
                    document.getElementById('other-user').style.display = 'none';
                    document.getElementById('other-loader').style.display = 'block';
                    document.getElementById('other-username').textContent = 'Finding...';
                }
            });
    
            peer.addEventListener('icecandidate', (event)=>{
                if (event.candidate){
                    // console.log('New ice candidate: ', JSON.stringify(peer.localDescription))
                    return;
                };
                sendSignal('new-answer', {
                    'sdp': peer.localDescription,
                    'receiver_channel_name': receiver_channel_name
                })
            });
    
            peer.setRemoteDescription(offer)
                .then(()=>{
                    // console.log('Remote description set successfully for ', peerUsername);
                    return peer.createAnswer();
                })
                .then(a=>{
                    // console.log('Answer created');
                    peer.setLocalDescription(a);
                })
        }
    };

    const connectionInterval = setInterval(()=>{
        connectToPeer();
    }, 3000);

}


// start calling
document.getElementById('start').addEventListener('click', function(){
    let username = document.getElementById('username').value;
    if (!username){
        alert('Please enter username.');
    }
    else{
        main(username);
    }
});