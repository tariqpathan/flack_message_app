document.addEventListener('DOMContentLoaded', () => {
    connectSocketIO();
    getDisplayName();
    checkChannelName();
    characterDisplay();
    addMessage();
});

var displayName;
var currentChannel;
var deletionTime = 20 * 1000; // grace period (in ms) for deleting messages
var infoTimeout = 3000; // time in ms that info messages are displayed
var socket;

function connectSocketIO () {
    socket = io.connect(window.location.protocol + '//' + document.domain + ':' + location.port);
    socket.on('connect', () => {
        console.log('client connected');
        socket.on('disconnect', () => console.log('client disconnected'));
    });

    socket.on('announce message', data => {
        if (currentChannel === data.channel) {
            displayMessage(data);
            const messageDisplayList = document.querySelector('#messageDisplayList');
            messageDisplayList.parentElement.scrollTop = messageDisplayList.scrollHeight; //scroll after all messages loaded
        };
    });

    socket.on('delete message', data => {
        if (currentChannel == data.channel) {
            let deleteButton = document.querySelector('#' + CSS.escape(data.timestamp));
            deleteButton.parentElement.parentElement.firstElementChild.innerHTML = "This message was deleted by the user"
            //loadChannel(data.channel);
        }
    });
}



function getDisplayName () {
    displayName = localStorage.getItem('displayName');
    if (displayName) {
        checkDisplayName (displayName);
    } else {
        submitDisplayName();
    };
}

// compares local storage to server for a unique displayname
function checkDisplayName (displayName) {
    const request = new XMLHttpRequest();
    request.open('POST', '/new_display_name');
    request.onload = () => {
        dataReturned = JSON.parse(request.responseText);
        if (dataReturned == 'Name taken') {
            localStorage.removeItem('displayName'); //clears local storage
            document.querySelector('#result').innerHTML = "Name taken"
            submitDisplayName();
        } else {
            document.querySelector('#displayNameFormDiv').style.display = "none"
            document.querySelector('#mainContainer').style.display = "flex"
            document.querySelector('#hello').innerHTML += ("Hello " + displayName);
            updateChannels();
        }
    };
    var data = new FormData;
    data.append('displayName', displayName);
    request.send(data);
    return false;
}

// displays form and checks user submission for a unique displayname
function submitDisplayName () {
    document.querySelector('#displayNameFormDiv').style.display = "block"
    document.querySelector('#mainContainer').style.display = "none"
    document.querySelector('#displayNameForm').onsubmit = () => {
        displayName = document.querySelector('#username').value
        document.querySelector('#result').innerHTML = ''
        localStorage.setItem('displayName', displayName);
        checkDisplayName (displayName);
        document.querySelector('#username').value = ''
        return false;
    };
}


// creates a list of all channels
function updateChannels () {
    const channelRequest = new XMLHttpRequest();
    channelRequest.open('GET', '/channel_update');
    channelRequest.onload = () => {
        const channelData = JSON.parse(channelRequest.responseText);

        if (channelRequest.status === 200 && channelData.length != 0) {
            //from channelData, extract list of channelNames
            document.querySelector('#channelList').innerHTML = '';
            document.querySelector('#channelDataList').innerHTML = '';
            for (const channel in channelData) {
                const li = document.createElement('li');
                li.innerHTML = channel.link('/' + channel);
                li.id = channel;
                li.querySelector('a').addEventListener("click", (a) => {
                    a.preventDefault();
                    changeChannel(li.querySelector('a').innerHTML);
                });

                document.querySelector('#channelList').append(li);

                // also add channels to channelDatalist
                const option = document.createElement('option');
                option.innerHTML = channel;
                option.value = channel;
                document.querySelector('#channelDatalist').append(option);
            }

            // loads messages once all channels are updated
            selectChannel();

        } else if (channelRequest.status === 200 && channelData.length == 0) {
            const li = document.createElement('li');
            li.innerHTML = "No Channels"
            document.querySelector('#channelList').append(li);

        } else {
            const li = document.createElement('li');
            li.innerHTML = "Error loading channels"
            document.querySelector('#channelList').append(li);
        }
    };

    channelRequest.send();
    return false;
}


// checks if a channel name is available
function checkChannelName () {
    document.querySelector('#channelForm').onsubmit = () => {
        if (document.querySelector('input#newChannel').value.length === 0) {
            return false
        }
        // clears the error message on a new submission
        document.querySelector('#result').innerHTML = '';

        const request = new XMLHttpRequest(); //XML request object
        const channelName = document.querySelector('input#newChannel').value;
        request.open('POST', '/new_channel');

        // This is what happens when the data is returned
        request.onload = () => {
            const data = JSON.parse(request.responseText);

            if (data.success) {
                updateChannels();
                localStorage.setItem('channel', channelName);
            } else {
                resultText = `There was an error creating a channel called ${channelName}`
                document.querySelector('#result').innerHTML = resultText;
                setTimeout(() => {
                    document.querySelector('#result').innerHTML = '';
                }, infoTimeout);
            };
        };

        // this is the data to send Flask
        var data = new FormData();
        data.append('channelName', channelName);

        // this sends the data
        request.send(data);

        // clears the form
        document.querySelector('input#newChannel').value = '';
        document.querySelector('input#newMessage').focus();
        // prevents form submission
        return false;
    };
}


// calculates characters remaining for the channel name form
function characterDisplay() {
    const newChannelInput = document.querySelector('input#newChannel');
    newChannelInput.addEventListener('focusin', displayChars);
    newChannelInput.addEventListener('keyup', displayChars);
    newChannelInput.addEventListener('focusout', displayChars);
}

function displayChars() {
    const channelNameLength = document.querySelector('input#newChannel').value.length;
    let chars = (channelNameLength ? channelNameLength : 0);
    document.querySelector('#counter').innerHTML = 10 - chars;
}


// loads the previous channel that a user was on
function selectChannel () {
    let data = localStorage.getItem('channel');

    // select form can change channel - maybe this could be placed elsewhere?
    const select = document.querySelector('#channelDatalist');
    select.addEventListener("change", (option) => {
        changeChannel(option.target.value);
    });
    if (data && data != "undefined") {
        currentChannel = data;
        loadChannel(data);
    } else {
        localStorage.removeItem('channel');
    }
}

// clears the message display list and selects a new channel to load
function changeChannel (a) {
    document.querySelectorAll('#channelList > li').forEach((item) => {
        item.style.fontWeight = 'normal'
    });
    loadChannel(a);
    currentChannel = a;
    localStorage.setItem('channel', a);
}

// loads all messages when a channel is selected
function loadChannel (data) {

    document.querySelector('#messageDisplayList').innerHTML = ''; // clears previously displayed messages
    document.querySelector('#messageInputContainer').style.display = "none"; // hides the message form

    const request = new XMLHttpRequest(); // creates AJAX GET Request for channel's messages
    request.open('GET', '/' + data);

    request.onload = () => {
        const messageList = JSON.parse(request.responseText); //messageList returned

        if (messageList == "error - channel not found") {
            const li = document.createElement('li');
            li.innerHTML = "Channel expired/invalid"
            document.querySelector('#messageDisplayList').append(li);
            setTimeout(() => {
                document.querySelector('#messageDisplayList').firstElementChild.remove();
            }, infoTimeout);
            localStorage.removeItem('channel');
        } else {

            localStorage.setItem('channel', currentChannel);
            // changes style to display which channel is selected
            document.querySelector('#' + CSS.escape(data)).style.fontWeight = 'bold';
            document.querySelector('#selectContainer > div > p').innerHTML = data

            if (messageList.length === 0) {
                const li = document.createElement('li');
                li.innerHTML = "No messages"
                document.querySelector('#messageDisplayList').append(li);
                setTimeout(() => {
                    document.querySelector('#messageDisplayList').firstElementChild.remove();
                }, infoTimeout);

            } else {

                for (item of messageList) {
                    displayMessage (item);
                }
            }
            // shows the message form
            document.querySelector('#messageInputContainer').style.display = "block";
            const messageDisplayList = document.querySelector('#messageDisplayList');
            messageDisplayList.parentElement.scrollTop = messageDisplayList.scrollHeight;; //scroll after all messages loaded

            // allows messages for that channel to be sent and received
            //addMessage();
        }
    }
    request.send();
    document.querySelector('#newMessage').focus();
    return false;
}


// allows users to post messages in realtime, without refresh
function addMessage () {
    // emit a new message announcement when message is posted
    document.querySelector('#messageButton').onclick = (event) => {
        event.preventDefault();
        console.log("hello");
        const message = document.querySelector('#newMessage').value;
        document.querySelector('#newMessage').value = '';
        console.log("hello");
        console.log(currentChannel);
        if (!currentChannel) {
            const li = document.createElement('li');
            li.innerHTML = "Pick a channel"
            document.querySelector('#messageDisplayList').append(li);
            setTimeout(() => {
                document.querySelector('#messageDisplayList').firstElementChild.remove();
            }, infoTimeout);
        } else {
            socket.emit('new message', {'currentChannel': currentChannel, 'displayName': displayName, 'message': message, 'timestamp': (new Date()).getTime()});
        }
        return false;
    }
}

// displays messages posted or retrieved via server
function displayMessage (data) {
    const readableTime = new Date(data.timestamp).toLocaleTimeString({hour: '2-digit', minute:'2-digit'});
    // copies a template div and inserts data into it
    let newMessage = document.querySelector('#message_template').content.cloneNode(true);
    const li = document.createElement('li');
    newMessage.querySelector('p').innerHTML = data.message //adds message
    newMessage.querySelector('.time_date').innerHTML = readableTime //adds time
    const deleteParent = newMessage.querySelector('.delete');
    deleteParent.id = data.timestamp; // used to select element
    // adds classes for differential styling
    if (data.displayName == displayName) {
        newMessage.firstElementChild.className = "outgoing_msg" //adds the class for incoming/outgoing
        newMessage.querySelector('p').className = "sent" // selects first p element for styling
        let timeLeft = (data.timestamp + deletionTime - Date.now());
        // adds a delete button if it is users message
        if (data.deleted == false && timeLeft >= 0 ) {
            const deleteButton = document.createElement('a');
            deleteButton.href = ""
            deleteButton.appendChild(document.createTextNode("Delete"));
            deleteButton.addEventListener("click", (e) => {
                e.preventDefault();
                deleteMessage(deleteParent);
            });

            var deleteTimer = new Promise(resolve => {
                setTimeout(() => resolve(deleteButton), timeLeft); // resolves when timer expires
            });

            deleteTimer.then((deleteButton) => {
                deleteButton.remove();
            });

            deleteParent.appendChild(deleteButton);
        }
    } else {
        newMessage.firstElementChild.className = "incoming_msg" // adds the class for incoming/outgoing
        newMessage.querySelector('p').className = "received" // selects first p element for styling
        newMessage.querySelector('.name').innerHTML = data.displayName //adds displayName

    }
    li.appendChild(newMessage);
    const messageDisplayList = document.querySelector('#messageDisplayList');
    messageDisplayList.append(li);
    // scroll to the bottom of the div
    messageDisplayList.parentElement.scrollTop = messageDisplayList.scrollHeight;
}

function deleteMessage (item) {
    socket.emit('delete request', {'channel': currentChannel, 'displayName': displayName, 'timestamp': item.id});
    item.firstElementChild.remove(); // removes the link
}
