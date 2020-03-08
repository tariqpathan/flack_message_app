# Project 2

Web Programming with Python and JavaScript

Objective
---------
To build a web-based messaging app that allowed users to send and receive messages in realtime without the need for a window refresh.

Users can create and join onto different messaging channels as well as select an initial username.

Constraints
-----------
In this project, I decided to use native JavaScript with socket.io. This was to gain a better understanding of the way the DOM model works and how JS interacts with the DOM.

Requirements
------------
-Users can choose a display name
-The display name will be remembered if the user closes the webpage and rejoins.
-Users can create channels which act like messaging rooms
-The channel a user was on will be remembered
-A list of available channels is available for users to browse
-All messages that have been sent on a channel should be retrieved when a user joins a channel, upto a maximum of 100 messages
-Messages should contain the time that they were sent and by whom
-Optionally, I have included to allow users to delete a message within 20 minutes of posting

Files
-----
application.py is the Flask server
templates > index.html and layout.html provide the html files for the content
static > styles.css contains the styling data
static > scripts.js contains the front-end logic for the site
requirements.txt shows what libraries are required for application.py

Additional information
----------------------
My JavaScript code splits into 4 main areas:
-Getting/submitting/checking the display name
-Getting/submitting/checking/loading channels
-Getting/submitting/loading messages
-Allowing realtime updates with socket.io

I have made use of AJAX a lot in this - something I did not fully understand until I did this project, as well as designing and implementing logic within my code to allow for different use cases whilst keeping code as small as possible. 
