// Function to allow the task to be moved
function allowDrop(ev) {
    ev.preventDefault();
}

// Function to be called when the drag starts
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

// Handle dragover event to detect the target position
function dragOver(ev) {
    ev.preventDefault();
    var target = ev.target;
    
    while (target && !target.classList.contains('task-item') && !target.classList.contains('task-list')) {
        target = target.parentNode;
    }

    var bounding = target.getBoundingClientRect();
    var offsetY = ev.clientY - bounding.top;
    
    if (target.classList.contains('task-item')) {
        target.style.borderTop = offsetY < target.offsetHeight / 2 ? '2px solid #000' : '';
        target.style.borderBottom = offsetY >= target.offsetHeight / 2 ? '2px solid #000' : '';
    }
}

// Handle drop event to insert the task in the correct position
function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var droppedElement = document.getElementById(data);
    var target = ev.target;

    while (target && !target.classList.contains('task-item') && !target.classList.contains('task-list')) {
        target = target.parentNode;
    }

    if (target && target !== droppedElement) {
        var bounding = target.getBoundingClientRect();
        var offsetY = ev.clientY - bounding.top;

        if (target.classList.contains('task-item')) {
            if (offsetY < target.offsetHeight / 2) {
                target.parentNode.insertBefore(droppedElement, target);
            } else {
                target.parentNode.insertBefore(droppedElement, target.nextSibling);
            }
        } else if (target.classList.contains('task-list')) {
            target.appendChild(droppedElement);
        }
        
        saveTasks();
    }
    
    // Clean up borders
    var allItems = document.querySelectorAll('.task-item');
    allItems.forEach(function(item) {
        item.style.borderTop = '';
        item.style.borderBottom = '';
    });
}

// Function to create a delete button for each task
function createDeleteButton(taskElement) {
    var deleteButton = document.createElement("button");
    deleteButton.className = 'delete-button';
    deleteButton.innerText = "Delete";
    deleteButton.onclick = function() {
        taskElement.remove();
        saveTasks(); // Save the changes after deleting the task
    };
    return deleteButton;
}

// Generate a unique ID
function generateUniqueId() {
    return 'task' + Date.now() + Math.random().toString(36).substr(2, 9);
}

// Function to add tasks to a specific list
function createNewTask(text, listId) {
    var newTask = document.createElement("div");
    newTask.className = 'task-item';
    var newTaskId = generateUniqueId();
    newTask.id = newTaskId;
    newTask.setAttribute('data-id', newTaskId);
    newTask.draggable = true;
    newTask.ondragstart = drag;

    var taskText = document.createElement("span");
    taskText.innerText = text;
    taskText.onclick = function() {
        enterEditMode(taskText);
    };
    newTask.appendChild(taskText);

    var deleteButton = createDeleteButton(newTask);
    newTask.appendChild(deleteButton);

    var listElement = document.getElementById(listId);
    listElement.appendChild(newTask);

    return newTask;
}


// Function to enter edit mode for a task's text
function enterEditMode(taskTextElement) {
    // Check if textarea field already exists
    if (taskTextElement.querySelector('textarea')) {
        // If textarea field already exists, focus on it
        return;
    }

    var textarea = document.createElement('textarea');
    textarea.value = taskTextElement.innerText;
    textarea.className = 'edit-textarea';

    // Handle textarea field's blur event (when it loses focus)
    textarea.onblur = function() {
        exitEditMode(textarea, taskTextElement);
    };

    // Handle Enter key press
    textarea.onkeypress = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            exitEditMode(textarea, taskTextElement);
        }
    };

    taskTextElement.innerText = '';
    taskTextElement.appendChild(textarea);
    textarea.focus();
}

// Function to exit edit mode and save changes
function exitEditMode(textareaElement, taskTextElement) {
    var newText = textareaElement.value.trim();
    if (newText) {
        taskTextElement.innerText = newText;
        saveTasks();  // Save changes to localStorage
    } else {
        alert("Task description cannot be empty.");
        taskTextElement.innerText = textareaElement.defaultValue; // Revert to previous text
    }
}

// Function to save tasks into local storage
function saveTasks() {
    var taskLists = document.getElementsByClassName("task-list");
    var tasksObj = {};

    for (var i = 0; i < taskLists.length; i++) {
        var listId = taskLists[i].id;
        var taskElements = taskLists[i].getElementsByClassName("task-item");

        tasksObj[listId] = [];
        for (var j = 0; j < taskElements.length; j++) {
            var taskText = taskElements[j].getElementsByTagName("span")[0].innerText;
            tasksObj[listId].push(taskText);
        }
    }

    localStorage.setItem('tasks', JSON.stringify(tasksObj));
}

// Function to load tasks from local storage
function loadTasks() {
    var tasksObj = JSON.parse(localStorage.getItem('tasks'));

    if (tasksObj) {
        for (var listId in tasksObj) {
            if (tasksObj.hasOwnProperty(listId)) {
                var taskTexts = tasksObj[listId];
                for (var i = 0; i < taskTexts.length; i++) {
                    var newTask = createNewTask(taskTexts[i], listId);
                    newTask.id = generateUniqueId(); // Ensure each loaded task has a unique ID
                    newTask.setAttribute('data-id', newTask.id);
                }
            }
        }
    }
    downloadTasksAsFile();
}

// Function to handle the Add Task button click event
function handleAddTask() {
    var taskInput = document.getElementById('new-task-input');
    var taskText = taskInput.value.trim();

    if (taskText) {
        createNewTask(taskText, 'in-progress');
        taskInput.value = ''; // Clear the input after adding the task
        saveTasks(); // Save the new state of the tasks after adding a new one
    } else {
        alert("Please enter a task description.");
    }
}

// Attach the event handler to the Add Task button
document.getElementById('add-task-button').addEventListener('click', handleAddTask);

// Load tasks when the page is loaded
window.onload = loadTasks;

function convertTasksToText() {
    var taskLists = document.getElementsByClassName("task-list");
    var tasksText = '';

    for (var i = 0; i < taskLists.length; i++) {
        var listElement = taskLists[i];
        var listTitleElement = listElement.firstElementChild;
        var listTitle = listTitleElement ? listTitleElement.innerText : "Task List";

        tasksText += `${listTitle}\n`;
        var taskElements = listElement.getElementsByClassName("task-item");
        for (var j = 0; j < taskElements.length; j++) {
            var taskText = taskElements[j].getElementsByTagName("span")[0].innerText;
            tasksText += ` ${taskText}\n\n`;
        }
        tasksText += '\n';
    }

    return tasksText;
}

function createTextFile(tasksText) {
    var blob = new Blob([tasksText], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    return url;
}

function getFormattedDate() {
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0'); // 月は0始まりなので+1する
    var day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function downloadTasksAsFile() {
    var tasksText = convertTasksToText();
    var fileUrl = createTextFile(tasksText);
    var fileName = `${getFormattedDate()}.txt`;

    var downloadLink = document.createElement("a");
    downloadLink.href = fileUrl;
    downloadLink.download = fileName;
    downloadLink.click();
    
    // Revoke the object URL after download
    URL.revokeObjectURL(fileUrl);
}

document.getElementById('download-tasks-button').addEventListener('click', downloadTasksAsFile);