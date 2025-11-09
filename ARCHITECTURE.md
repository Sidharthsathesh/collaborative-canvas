# Collaborative Canvas — Architecture Documentation

**Author:** Sidharth Sathesh  
**Project Duration:** 3 Days  

---

## 1. Overview

The **Collaborative Canvas** is a real-time drawing application that allows multiple users to draw on the same shared board at the same time.  
It is built using **Node.js**, **Express**, and **Socket.io** for the backend, and **HTML5 Canvas** for drawing on the frontend.  

The main idea behind the project is to let users connect to a common server, draw freely, and see each other’s drawings instantly without needing to refresh the page.  
This is achieved through **WebSocket communication**, which enables two-way, live data transfer between the server and all connected clients.

---

## 2. How the System Works

When a user starts drawing, their strokes are captured as a series of coordinate points (x, y).  
These points, along with color, brush size, and tool type (brush or eraser), are sent to the server through **Socket.io**.

The server immediately broadcasts this drawing data to all other users connected to the same session.  
Each client receives these updates and draws the same strokes on its own canvas.  
This is what creates the **real-time synchronization** between all users.

### Step-by-step Flow:
1. User connects to the server.  
2. The client captures drawing events (start, move, end).  
3. These events are converted into small packets of data and sent to the server.  
4. The server shares the data with all other connected clients.  
5. Each client draws the same stroke locally on their canvas.

---

## 3. Data Flow 

The following diagram explains how data moves between the client and the server during drawing:

User Action
↓
Client (draws on Canvas)
↓
Sends data via Socket.io
↓
Server (receives stroke data)
↓
Broadcasts to all connected clients
↓
All canvases update instantly
---

## 4. Communication Between Client and Server

The app uses **WebSocket events** (through Socket.io) to send and receive messages instantly.

### Events Sent by the Client
| Event | Description |
|--------|-------------|
| `stroke-chunk` | Sent continuously while the user draws. Contains a small set of points. |
| `stroke-final` | Sent when the user finishes drawing a stroke. |
| `cursor` | Sends the user’s cursor position to show where they are drawing. |
| `undo` | Requests the server to hide the last visible stroke. |
| `redo` | Requests the server to show a previously undone stroke. |
| `join` | Informs the server that a new user has joined the canvas. |

### Events Sent by the Server
| Event | Description |
|--------|-------------|
| `init-state` | Sends the existing drawing history to a new user. |
| `op` | Broadcasts new or updated drawing operations to all users. |
| `cursor` | Shares live cursor positions of other users. |
| `users` | Updates the list of all currently connected users. |

---

## 5. Undo and Redo Implementation

Undo and redo actions are handled globally, meaning all users see the same result.

**How it works:**
1. Each stroke drawn by a user is stored on the server as an **operation** with a unique ID.  
2. When a user clicks “Undo,” the server marks the most recent visible operation as hidden.  
3. The updated state is then broadcast to all users.  
4. Each client re-renders the canvas without that stroke.  
5. “Redo” simply reactivates the hidden stroke and shows it again on all canvases.

This keeps the drawing consistent for everyone, no matter who performs the action.

---

## 6. Performance Design

To keep the drawing smooth and efficient, a few design decisions were made:

| Design Choice | Purpose |
|----------------|----------|
| **Chunk-based updates** | Instead of sending every single point, strokes are divided into small chunks to reduce network load. |
| **Quadratic curve smoothing** | Makes drawn lines look natural and continuous instead of jagged. |
| **Chunk stitching** | Connects multiple stroke chunks so that the lines appear seamless for all users. |
| **Client-side prediction** | The stroke appears instantly for the drawer before being confirmed by the server, reducing visible delay. |
| **Optimized redraws** | The canvas only redraws when necessary (like on undo/redo). |

These techniques ensure that even if many users draw simultaneously, the performance remains smooth and stable.

---

## 7. Conflict Handling

Since multiple users can draw at the same time, there’s a chance of overlapping strokes.  
This is handled by assigning a **unique ID** to every stroke and user.

- Each user’s drawing data is tagged with a `userId` and `strokeId`.  
- The server keeps a single, ordered list (called `opLog`) of all strokes.  
- Every new stroke is added to this list in the order it is received.  
- The server then broadcasts the strokes to all users in the same sequence.

This ensures that all users see the same final result without any data conflicts.

---

## 8. Undo/Redo Logic Example

Here’s what one drawing operation looks like:

```javascript
{
  id: "stroke-001",
  userId: "user-123",
  tool: "brush",
  color: "#00aaff",
  width: 5,
  points: [{x: 100, y: 200}, {x: 110, y: 210}],
  visible: true
}
If the stroke is undone, the visible property becomes false, and all clients hide it from their canvas.
Redo simply changes it back to true.

9. Future Improvements
Add multiple rooms: So users can have separate drawing sessions.

Add database storage: To save and load previous drawings.

Add authentication: Users can join with their name or ID.

Add mobile touch support: For smooth drawing on phones and tablets.

Add more tools: Shapes, text, or image uploads.

10. Summary
The Collaborative Canvas project is a simple but powerful demonstration of how real-time web applications work.
It combines live communication, event-driven programming, and a shared visual interface in one system.

Through this project, I learned how:

WebSockets enable live two-way communication.

Servers manage shared data consistently across clients.

Undo/redo and synchronization work in collaborative systems.

Simple tools like HTML5 Canvas and Socket.io can be used to build complex real-time applications.

