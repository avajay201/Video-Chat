function main(){
    let h1Height = document.getElementsByTagName("h1")[0].offsetHeight;
    let mainDiv = document.getElementById("main");
    if (!mainDiv){
        return;
    }
    mainDiv.style.height = "calc(100vh - " + (h1Height + h1Height + h1Height) + "px)";
    let selfPeer = document.getElementById('username').value;
    let age = document.getElementById('age').value;
    let gender = document.getElementById('gender').value;
    if (!selfPeer){
        alert('Something went wrong.');
        window.location.href = '/';
    }
    let mapPeers = {};
    let connectionInterval;
    let connectivityInterval;

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

    const userMedia = navigator.mediaDevices?.getUserMedia(constraints)
                        .then((stream) => {
                            selfStream = stream;
                            selfVideo.srcObject = selfStream;
                            selfVideo.muted = true;
                        })
                        .catch(error=>{
                            alert('Camera access failed.');
                            window.location.href = '/';
                        });

    // web rtc connection
    let websocket;
    function conectivity(){
        console.log('connecting...');
        // creating websokcet url
        let host = window.location.host;
        let protocol = window.location.protocol;
        let websocket_protocol = protocol === 'https:' ? 'wss://' : 'ws://';
        let socket_url = websocket_protocol + host + '/ws/video_call/';

        function connectToPeer(){
            // creating websocket connection
            websocket = new WebSocket(socket_url);
            websocket.onopen = function (event) {
                // console.log('WebSocket connected');
                sendSignal('new-peer', {});
                clearInterval(connectionInterval);
                clearInterval(connectivityInterval);
            }
            websocket.onmessage = function (event) {
                let parsedData = JSON.parse(event.data);
                console.log('Message recieved -', parsedData);
                if (parsedData['status'] === 'disconnect'){
                    for (let peerUser in mapPeers) {
                        let peer = mapPeers[peerUser][0];
                        peer.close();
                        // delete mapPeers[peerUser];
                        mapPeers = {};
                    }
                    document.getElementById('skip').style.display = 'none';
                    document.getElementById('other-user').style.display = 'none';
                    document.getElementById('other-loader').style.display = 'block';
                    document.getElementById('other-username').textContent = 'Finding...';
                    websocket.close();
                    connectivityInterval = setInterval(()=>{
                        conectivity();
                    }, 2000);
                    return;
                };

                let peerUser = parsedData['peer'];
                let peerGender = parsedData['gender'];
                let peerAge = parsedData['age'];
                let peerData = [peerUser, peerAge, peerGender]
                let action = parsedData['action'];
                if (selfPeer === peerUser){
                    return;
                }
                console.log('mapPeers>>>', Object.keys(mapPeers));
                let connectedUser = document.getElementById('other-username').textContent;
                if (Object.keys(mapPeers).length < 2 && connectedUser === 'Finding...'){
                    console.log('Adding member...')
                    let receiver_channel_name = parsedData['message']['receiver_channel_name'];
                    if (action === 'new-peer'){
                        createOffer(peerData, receiver_channel_name);
                    }
                    else if (action === 'new-offer'){
                        let offer = parsedData['message']['sdp'];
                        createAnswer(offer, peerData, receiver_channel_name);
                    }
                    else if (action === 'new-answer'){
                        let answer = parsedData['message']['sdp'];
                        let peer = mapPeers[peerUser][0];
                        peer.setRemoteDescription(answer);
                    }
                };

            }
            websocket.onclose = function (event) {
                // console.log('WebSocket disconnected');
            }
            websocket.onerror = function (event) {
                // console.log('WebSocket error occurred.');
            }

            // send signal to server
            function sendSignal(action, message){
                let signal = JSON.stringify({
                    'peer': selfPeer,
                    'age': age,
                    'gender': gender,
                    'action': action,
                    'message': message,
                });
                websocket.send(signal);
            }

            // create connection with new peer
            function createOffer(peerData, receiver_channel_name){
                let peer = new RTCPeerConnection(null);
                addLocalTracks(peer);
                let dc = peer.createDataChannel('channel')
                dc.addEventListener('open', ()=>{
                    // console.log('Connection opened');
                });

                setOnTrack(peer, peerData);

                // store connected peers
                mapPeers[peerData[0]] = [peer, dc];

                // peer.addEventListener('iceconnectionstatechange', ()=>{
                //     let iceConnectionState = peer.iceConnectionState;
                //     if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
                //         // close remote peer stream
                //         delete mapPeers[peerData[0]];
                //         peer.close();
                //         document.getElementById('skip').style.display = 'none';
                //         document.getElementById('other-user').style.display = 'none';
                //         document.getElementById('other-loader').style.display = 'block';
                //         document.getElementById('other-username').textContent = 'Finding...';
                //     }
                // });

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
                });
                // skip peer
                document.getElementById('skip').style.display = 'block';
            }

            // set on track remote peer stream
            function setOnTrack(peer, peerData){
                let peerStream = document.getElementById('other-user');
                let remoteStream = new MediaStream();
                peerStream.srcObject = remoteStream;

                peer.addEventListener('track', async(event)=>{
                    remoteStream.addTrack(event.track, remoteStream);
                });
                document.getElementById('other-username').textContent = peerData[0] + ' | ' + peerData[1] + 'y | ' + peerData[2];
                document.getElementById('other-loader').style.display = 'none';
                peerStream.style.display = 'block';
            };

            // create answer
            function createAnswer(offer, peerData, receiver_channel_name){
                let peer = new RTCPeerConnection(null);

                addLocalTracks(peer);

                setOnTrack(peer, peerData);

                peer.addEventListener('datachannel', e=>{
                    peer.dc = e.channel;
                    peer.dc.addEventListener('open', ()=>{
                        // console.log('Connection opened');
                    });

                    // store connected peers
                    mapPeers[peerData[0]] = [peer, peer.dc];
                })

                // peer.addEventListener('iceconnectionstatechange', ()=>{
                //     console.log('state changin....', peer.iceConnectionState);
                //     let iceConnectionState = peer.iceConnectionState;
                //     if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
                //         // close remote peer stream
                //         delete mapPeers[peerData[0]];
                //         peer.close();
                //         document.getElementById('skip').style.display = 'none';
                //         document.getElementById('other-user').style.display = 'none';
                //         document.getElementById('other-loader').style.display = 'block';
                //         document.getElementById('other-username').textContent = 'Finding...';
                //     }
                // });

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
                        // console.log('Remote description set successfully for ', peerData[0]);
                        return peer.createAnswer();
                    })
                    .then(a=>{
                        // console.log('Answer created');
                        peer.setLocalDescription(a);
                    })
            }
        };

        connectionInterval = setInterval(()=>{
            connectToPeer();
        }, 5000);
    };

    // start finding peer
    document.getElementById('start').addEventListener('click', ()=>{
        document.getElementById('start-btn').style.display = 'none';
        document.getElementsByClassName('other-peer')[0].style.display = 'flex';
        document.getElementsByClassName('peer')[0].style.position = 'relative';
        document.getElementsByClassName('peer')[1].style.position = 'relative';
        setTimeout(()=>{
            conectivity();
        }, 2000);
    });

    // skip connected peer
    document.getElementById('skip').addEventListener('click', function() {
        for (let peerUser in mapPeers) {
            let peer = mapPeers[peerUser][0];
            peer.close();
            // delete mapPeers[peerUser];
            mapPeers = {};
        }
        this.style.display = 'none';
        document.getElementById('other-user').style.display = 'none';
        document.getElementById('other-loader').style.display = 'block';
        document.getElementById('other-username').textContent = 'Finding...';
        websocket.close();
        setTimeout(()=>{
            conectivity();
        }, 2000);
    });

}

document.addEventListener('DOMContentLoaded', () => {
    // start calling
    main();

    setTimeout(()=>{
        document.getElementById('start-btn').style.display = 'block';
    }, 3000);


    // registeration
    document.getElementById('register-form')?.addEventListener('submit', function(event) {
        const fname = document.getElementById('fname').value;
        const lname = document.getElementById('lname').value;
        const username = document.getElementById('username').value;
        const gender = document.getElementById('gender').value;
        const password = document.getElementById('password').value;
        const cpassword = document.getElementById('cpassword').value;
        const dob = document.getElementById('dob').value;

        if (!fname || !lname || !username || !gender || !password || !cpassword || !dob) {
            event.preventDefault();
            alert('Please fill in all fields.');
        } else if (password !== cpassword) {
            event.preventDefault();
            alert('Passwords does not match.');
        } else if (password.length < 6) {
            event.preventDefault();
            alert('Minimum password length must be 6.');
        }
    });


    // login
    document.getElementById('login-form')?.addEventListener('submit', function(event) {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            event.preventDefault();
            alert('Please fill in all fields.');
        }
    });

    // edit profile
    document.getElementById('edit-profile')?.addEventListener('click', (event) => {
        document.getElementById('user-details').style.display = 'none';
        document.getElementById('profile-form').style.display = 'flex';
    });

    document.getElementById('profile-form')?.addEventListener('submit', (event) => {
        const fname = document.getElementById('fname').value;
        const lname = document.getElementById('lname').value;
        const gender = document.getElementById('gender').value;
        const dob = document.getElementById('dob').value;

        if (!fname || !lname || !gender || !dob) {
            event.preventDefault();
            alert('Please fill in all fields.');
        }
    })
});