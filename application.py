import os

from flask import Flask, jsonify, redirect, render_template, request, session
from flask_socketio import SocketIO, emit
#from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(20)
#Session(app)
#session['current_users'] = []
socketio = SocketIO(app)
current_users = []

class my_list(list):
    def append(self, item):
        list.append(self, item)
        if len(self) > 100: self[:1]=[]

list1 = my_list([{'displayName': 'tariq', 'message': 'urface', 'timestamp': 1575112612345, 'deleted': False}])
list2 = my_list([{'displayName': 'joseph', 'message': 'howdy1', 'timestamp': 1575112612145, 'deleted': False}])
list3 = my_list([{'displayName': 'tariq', 'message': 'killyoself', 'timestamp': 1575112612345, 'deleted': False}, {'displayName': 'tariq', 'message': 'howdy2', 'timestamp': 1575112612390, 'deleted': False}])

for i in range(97):
    list3.append({'displayName': 'yolo', 'message': i, 'timestamp': 1575112612345 + (i*1000)})

channels = {'one': {'messageList': list1},
'two': {'messageList': list2},
'three': {'messageList': list3}}

@app.route("/", methods=["GET"])
def index():
    print(f"current users: {current_users}")
    print(session)
    return render_template("index.html")

@app.route('/new_display_name', methods=['POST'])
def new_display_name():
    display_name = request.form.get("displayName")
    if (display_name in current_users):
        try:
            session['display_name']
            if session['display_name'] == display_name:
                return jsonify(display_name)
            else:
                return jsonify("Name taken")
        except KeyError:
            return jsonify("Name taken")
    else:
        current_users.append(display_name)
        session['display_name'] = display_name
        return jsonify(display_name)

@app.route('/new_channel', methods=['POST'])
def new_channel():
    """ Creates a new channel and updates the channel dict """
    new_channel = request.form.get("channelName") #gets it from XHR FormData
    newdict = {new_channel: {'messageList': []}}
    if not channels:
        channels.update(newdict)
        return jsonify({"success": True})
    else:
        for channel in channels:
            if channel.casefold() == new_channel.casefold():
                return jsonify({"success": False})

        channels.update(newdict)
        return jsonify({"success": True})


@app.route('/channel_update', methods=['GET'])
def channel_update():
    """ Sends channel data to client """
    if not channels:
        return jsonify([])
    else:
        return jsonify(channels)


@app.route('/<string:channel_name>', methods=['GET'])
def display_channel(channel_name):
    """ Sends message data for a selected channel """
    for channel in channels:
        if channel == channel_name:
            return jsonify(channels[channel]['messageList'])

    return jsonify("error - channel not found")


@socketio.on("new message")
def message(data):
    channel = data['currentChannel'] # gets channel for appending message to
    message_list = channels[channel]['messageList'] # creates a list to add to the channel's dict
    message_dict = {'displayName': data['displayName'], 'message': data['message'], 'timestamp': data['timestamp'], 'deleted': False}
    message_list.append(message_dict)

    """Emits a message to the sender"""
    emit('announce message', {'displayName': data['displayName'], 'message': data['message'], 'timestamp': data['timestamp'], 'deleted': False,
    'channel': channel, 'class1': 'outgoing_msg', 'class2': 'sent'},
    broadcast=False) #broadcasts this to sender (outgoing)

    """Emits a message to all other clients"""
    emit('announce message', {'displayName': data['displayName'], 'message': data['message'], 'timestamp': data['timestamp'], 'deleted': False,
    'channel': channel, 'class1': 'incoming_msg', 'class2': 'received'},
    broadcast=True, include_self=False) #broadcasts this to everyone except sender (incoming)

@socketio.on('delete request')
def delete_message(data):
    channel = data['channel']
    displayName = data['displayName']
    timestamp = data['timestamp']
    messages_array = channels[channel]['messageList']
    for message in messages_array:
        if (int(message['timestamp']) == int(timestamp)) and (message['displayName'] == displayName):
            # should set a property of the message that sets deleted flag to 1.
            message['message'] = 'This message was deleted by the user'
            message['deleted'] = True
            emit('delete message', {'channel': channel, 'displayName': displayName, 'timestamp': timestamp, 'deleted': True}, broadcast=True)

# Code below for debugger, autoloading and Flask-SocketIO to work properly
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1")

""" Run as py application.py in windows"""
