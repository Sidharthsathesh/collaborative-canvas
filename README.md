# Collaborative Canvas — Placement Project

**Author:** Sidharth Sathesh  
**Time Taken:** 3 Days  

---

## Overview

This is a real-time collaborative drawing application where multiple users can draw together on a single canvas.  
It works using **HTML5 Canvas** for drawing and **Socket.io** with **Node.js** for live communication between all connected users.

I created this project as part of my placement work to explore how real-time systems work.  
It helped me understand how data is shared instantly between users, how events are synchronized, and how to manage a shared canvas without using any external frameworks.

---

## Setup Instructions

### What You Need
- Node.js (version 18 or higher)
- npm (comes automatically with Node.js)

### How to Run the Project

1. Open the project folder in **Visual Studio Code**.
2. Open the terminal and install all dependencies:
   ```bash
   npm install
Start the server:

bash
Copy code
node server/server.js
(If you’ve added a start script inside package.json, you can also use npm start.)

Open your browser and go to:

arduino
Copy code
http://localhost:3000
Once the page opens, you’ll see a drawing board that you can use right away.

How to Test with Multiple Users
Run the project using the above steps.

Open two or more tabs or different browsers on your computer.

Visit:

arduino
Copy code
http://localhost:3000
on each tab.

Try drawing in one tab — the strokes will appear instantly on the others too.

You can also test the eraser, color selection, undo, redo, and save options to see how they work in sync across all tabs.

Main Features
Brush and Eraser Tools – lets you draw and erase freely.

Color Options – you can either use preset colors or choose any shade using the color picker.

Brush Size Control – change the width of the brush using a simple slider.

Real-Time Sync – multiple users can draw together on the same canvas at once.

Undo and Redo – globally synchronized, so everyone sees the same result.

Live Cursors – shows where other users are currently drawing.

Save Drawing – lets you download your canvas as a PNG image.

Smooth Drawing – strokes appear natural and continuous using curve smoothing.

User List – displays the users currently connected to the session.

Known Limitations
Drawings are not saved permanently — everything is cleared when the server restarts.

Undo and Redo history resets when a page is refreshed.

Small delays may appear when several users draw at the same time.

There is no login or authentication system — all users are anonymous.

Work Timeline
Task	Time Taken
Designing and coding the drawing tools	1 Day
Setting up Socket.io and real-time features	1 Day
Adding Undo/Redo, color picker, and save option	0.5 Day
Testing, debugging, and fine-tuning the UI	0.5 Day
Total Time Spent	3 Days

Developer Details
Name: Sidharth Sathesh
Course: B.Tech in Automation and Robotics Engineering
Areas of Interest: Robotics, Artificial Intelligence, Real-Time Systems
GitHub: github.com/your-username

What I Learned
Working on this project helped me understand:

How WebSockets enable instant, two-way communication between users.

How to synchronize shared states across multiple clients using events.

How to integrate a responsive frontend (Canvas) with a Node.js backend.

How to design a simple and clean user interface that updates in real time.

Quick Commands
To run the project:

bash
Copy code
npm install
npm start
Then open your browser at:

arduino
Copy code
http://localhost:3000
Summary
The Collaborative Canvas project combines creativity and technology by allowing real-time multi-user drawing on a single shared board.
It shows practical use of event-driven programming, server-client architecture, and synchronization — all done using simple, lightweight tools like Node.js, Socket.io, and Vanilla JavaScript.

This was a great hands-on experience that helped me understand how real-time applications actually work.

yaml
Copy code