self.addEventListener("notificationclick", (event) => {
    const notify = event.notification;
    const action = event.action;
    
    if (action === "close") {
        notify.close();
    } else {
        event.waitUntil(
            clients.openWindow('../done.html')
        );
    }
});
