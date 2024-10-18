// Firebaseの初期化（重複を削除）
const firebaseConfig = {
    apiKey: "AIzaSyBWwkFbV-D97_TgdXVW4eRITcdWf_8f2dY",
    authDomain: "tasker-2f1b5.firebaseapp.com",
    projectId: "tasker-2f1b5",
    storageBucket: "tasker-2f1b5.appspot.com",
    messagingSenderId: "131467156866",
    appId: "1:131467156866:web:6e15d9718a08f5148ac39b"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ドラッグ＆ドロップの関数
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

// ドラッグ＆ドロップの関数
async function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var droppedElement = document.getElementById(data);
    var target = ev.target;

    // タスクのステータスを更新
    let newListElement = target;

    // targetがtask-listクラスを持っている要素を見つけるまで、親を遡る
    while (newListElement && !newListElement.classList.contains('task-list')) {
        newListElement = newListElement.parentNode;
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
        
        // タスクのステータスを更新
        if (newListElement) {
            const newListId = newListElement.id; // task-listクラスを持つdivのidを取得
            const taskId = droppedElement.id;
            await db.collection('tasks').doc(taskId).update({ listId: newListId });
            
            // 新しいリストの全タスクの位置を更新
            await updatePositions(newListElement);
        }
    }
}

// リスト内のタスクのpositionを更新する関数
async function updatePositions(listElement) {
    const tasks = Array.from(listElement.querySelectorAll('.task-item'));
    const batch = db.batch();
    
    tasks.forEach((task, index) => {
        const taskRef = db.collection('tasks').doc(task.id);
        batch.update(taskRef, { position: index });
    });
    
    try {
        await batch.commit();
    } catch (error) {
        console.error("Error updating positions:", error);
        alert("タスクの順序更新中にエラーが発生しました。");
    }
}


// 削除ボタンの作成
function createDeleteButton(taskElement, taskId) {
    var deleteButton = document.createElement("button");
    deleteButton.className = 'delete-button';
    deleteButton.innerText = "Delete";
    deleteButton.onclick = async function() {
        try {
            await deleteTask(taskId);
            taskElement.remove();
        } catch (error) {
            console.error("Error deleting task:", error);
            alert("タスクの削除中にエラーが発生しました。");
        }
    };
    return deleteButton;
}

// タスクの作成（新規追加用）
async function createNewTask(text, listId) {
    try {
        // 現在のリスト内のタスク数を取得して position を割り当て
        const snapshot = await db.collection('tasks').where('listId', '==', listId).get();
        const position = snapshot.size; // 次の利用可能な位置を position とする

        // Firestore に新しいタスクを追加
        const newTaskRef = await db.collection('tasks').add({
            description: text,
            status: "in-progress",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            listId: listId,
            position: position // Position を追加
        });

        var newTask = document.createElement("div");
        newTask.className = 'task-item';
        newTask.id = newTaskRef.id;
        newTask.draggable = true;
        newTask.ondragstart = drag;

        var taskText = document.createElement("span");
        taskText.innerText = text;
        taskText.onclick = function() {
            enterEditMode(taskText, newTaskRef.id);
        };
        newTask.appendChild(taskText);

        var deleteButton = createDeleteButton(newTask, newTaskRef.id);
        newTask.appendChild(deleteButton);

        var listElement = document.getElementById(listId);
        listElement.appendChild(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        alert("タスクの作成中にエラーが発生しました。");
    }
}

// タスクの表示（ロード時用）
function displayTask(doc) {
    const task = doc.data();
    const taskId = doc.id;

    var newTask = document.createElement("div");
    newTask.className = 'task-item';
    newTask.id = taskId;
    newTask.draggable = true;
    newTask.ondragstart = drag;

    var taskText = document.createElement("span");
    taskText.innerText = task.description;
    taskText.onclick = function() {
        enterEditMode(taskText, taskId);
    };
    newTask.appendChild(taskText);

    var deleteButton = createDeleteButton(newTask, taskId);
    newTask.appendChild(deleteButton);

    var listElement = document.getElementById(task.listId);
    listElement.appendChild(newTask);
}

// 編集モードに入る関数
function enterEditMode(taskTextElement, taskId) {
    if (taskTextElement.querySelector('textarea')) {
        return;
    }

    var textarea = document.createElement('textarea');
    textarea.value = taskTextElement.innerText;
    textarea.className = 'edit-textarea';

    textarea.onblur = function() {
        exitEditMode(textarea, taskTextElement, taskId);
    };

    textarea.onkeypress = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            exitEditMode(textarea, taskTextElement, taskId);
        }
    };

    taskTextElement.innerText = '';
    taskTextElement.appendChild(textarea);
    textarea.focus();
}

// 編集モードを終了し、変更を保存する関数
async function exitEditMode(textareaElement, taskTextElement, taskId) {
    var newText = textareaElement.value.trim();
    if (newText) {
        try {
            taskTextElement.innerText = newText;
            await db.collection('tasks').doc(taskId).update({ description: newText });
        } catch (error) {
            console.error("Error updating task:", error);
            alert("タスクの更新中にエラーが発生しました。");
            taskTextElement.innerText = textareaElement.defaultValue;
        }
    } else {
        alert("Task description cannot be empty.");
        taskTextElement.innerText = textareaElement.defaultValue;
    }
}

// タスクのロードする関数
async function loadTasks() {
    try {
        const snapshot = await db.collection('tasks').orderBy('listId').orderBy('position').get();
        snapshot.forEach(doc => {
            displayTask(doc);
        });
    } catch (error) {
        console.error("Error loading tasks:", error);
        alert("タスクのロード中にエラーが発生しました。");
    }
}


// タスクの追加ボタンのハンドラー
async function handleAddTask() {
    var taskInput = document.getElementById('new-task-input');
    var taskText = taskInput.value.trim();

    if (taskText) {
        await createNewTask(taskText, 'in-progress');
        taskInput.value = '';
    } else {
        alert("Please enter a task description.");
    }
}

// タスクの削除関数
async function deleteTask(taskId) {
    try {
        await db.collection('tasks').doc(taskId).delete();
    } catch (error) {
        console.error("Error deleting task:", error);
        alert("タスクの削除中にエラーが発生しました。");
    }
}

// ダウンロードボタンのハンドラー（未使用の機能を無効化）
document.getElementById('download-tasks-button').addEventListener('click', function() {
    alert("This feature is no longer available since tasks are now stored in Firestore.");
});

// イベントリスナーの設定
document.getElementById('add-task-button').addEventListener('click', handleAddTask);

// ページロード時にタスクをロード
window.onload = loadTasks;