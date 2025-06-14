//database code
var store;
var dbPromise;

var idbApp = (function() {
    'use strict';

dbPromise = idb.open("database", 3, function(upgradeDB) {
    let store;
    switch (upgradeDB.oldVersion) {
        case 0:
            store = upgradeDB.createObjectStore('task-list', { keyPath: 'id' });
        case 1:
            store = store || upgradeDB.transaction.objectStore('task-list');
            store.createIndex('taskDate', 'taskDate', { unique: false });
    }
});

})();

updateTable();

var taskInfo = {};

document.getElementById("todo-form").addEventListener("submit", function() {
    taskInfo.id = document.getElementById("task-title").value;
    taskInfo.taskDate = document.getElementById("task-date").value;

    let currentDate = new Date();
    let taskDate = new Date(taskInfo.taskDate);

    if (currentDate.getTime() > taskDate.getTime()) {
        taskInfo.notified = "yes";
        showNotification(taskInfo.id);
    }
    else {
        taskInfo.notified = "no";
    }

    addTask();
})

function updateTable() {
    getTasks().then(data => {
        if (data) {
            let tbody = document.querySelector("#task-table tbody");
            tbody.remove();
        
            let table = document.getElementById("task-table");
        
            tbody = document.createElement("tbody");
            table.appendChild(tbody);
        
            for (let element in data) {
                let info = data[element];

                let tr = document.createElement("tr");
                
                let td = document.createElement("td");
                if (info.notified == "yes") {
                    td.classList.add("omitted");
                }
                td.innerHTML = info.id;
                tr.appendChild(td);
        
                td = document.createElement("td");
                if (info.notified == "yes") {
                    td.classList.add("omitted");
                }
                let funDate = new Date(info.taskDate);
                let dispDate = formatDate(funDate);
                td.innerHTML = dispDate;
                tr.appendChild(td);
        
                td = document.createElement("td");
                let btn = document.createElement("button");
                btn.innerText = "X";
                btn.className = "delete-btn";
                btn.addEventListener("click", () => {
                    let ans = confirm("are you sure you want to delete this task?");
                    if (ans) {
                        deleteTask(info.id);
                    }
                });
                td.appendChild(btn);
                tr.appendChild(td);
        
                tbody.prepend(tr);
            }
        }
    })
}

async function deleteTask(id) {
    try {
        let db = await dbPromise;
        let tx = db.transaction("task-list", "readwrite");
        store = tx.objectStore("task-list");
    
        await store.delete(id);
        await tx.done;
    } catch (error) {
        console.log(error);
    }

    updateTable();
}

function addTask() {
    dbPromise.then(db => {
        let tx = db.transaction("task-list", "readwrite");
        store = tx.objectStore("task-list");

        return store.add(taskInfo).then(() => {
            console.log("items added successfully");
        }).catch(err => {
            tx.abort();
            alert(err);
        })
    })
}

async function getTasks() {
    try {
        let db = await dbPromise;
        let tx = db.transaction('task-list', 'readonly');
        store = tx.objectStore('task-list');
        let index = store.index('taskDate');

        let tasks = await index.getAll();

        tasks.sort((a, b) => {
            if (a.notified === "no" && b.notified === "yes") {
                return 1;
            } else if (a.notified === "yes" && b.notified === "no") {
                return -1;
            } else {
                return new Date(a.taskDate) - new Date(b.taskDate);
            }
        });

        await tx.done;

        return tasks;
    } catch (error) {
        console.error(error);
    }
}

function formatDate(dateObj) {
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };

    const date = dateObj.toLocaleDateString('en-US', dateOptions);
    const time = dateObj.toLocaleTimeString('en-US', timeOptions);

    return `${time}<br>${date}`;
}

setInterval(() => {
    getTasks().then(data => {
        for (element in data) {
            let info = data[element];
            if (info.notified == "no") {
                let now = new Date();
                let taskDate = new Date(info.taskDate);
                if (now.getTime() > taskDate.getTime()) {
                    showNotification(`${info.id} is completed`)
                    info.notified = "yes";
                    updateNotified(info);
                    updateTable();
                }
            }
        }
    })
}, 5000);

function showNotification(bodyText) {
    if ("Notification" in window && "serviceWorker" in navigator) {
        Notification.requestPermission().then(function (result) {
            if (result === "granted") {
                navigator.serviceWorker.register("sw.js")
                .then(function (registration) {
                    console.log("Service Worker registered with scope:", registration.scope);
                    return navigator.serviceWorker.ready;
                })
                .then(function (registration) {
                    registration.showNotification("Todo App", {
                        body: bodyText,
                        icon: "../images/checkmark.png",
                    });
                })
                .catch(function (err) {
                    console.error("Service Worker registration failed:", err);
                });
            } else {
                console.log("Notification permission not granted.");
            }
        });
    }
}

function updateNotified(task) {
    dbPromise.then(db => {
        let tx = db.transaction("task-list", "readwrite");
        store = tx.objectStore("task-list");

        return store.put(task).then(() => {
            console.log("'notified' successfully updated");
        }).catch(err => {
            tx.abort();
            alert(err);
        })
    })
}

