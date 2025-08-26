// This is the main plugin object
var vpnViewerPlugin = {};

// This function is called when the web UI is fully loaded.
// We will add our button here.
vpnViewerPlugin.onWebUIStartupEnd = function () {
    // Find the target element where we want to add the button.
    // Based on the screenshot, a good place is the 'basset' div inside 'topbar'.
    const topBar = document.getElementById('topbar');
    if (topBar) {
        const basset = topBar.querySelector('.basset');
        if (basset) {
            // Create a new button element
            const newButton = document.createElement('button');

            // Set button properties
            newButton.className = 'button'; // You can style it further with CSS if needed
            newButton.innerText = 'VPN'; // The text on the button

            // Add an action to the button (e.g., show an alert)
            newButton.onclick = function () {
                alert('VPN Viewer button clicked!');
                // You can replace this with any other JavaScript function,
                // for example, opening a new window or a dialog box.
            };

            // Add the button to the 'basset' element
            basset.appendChild(newButton);
        } else {
            console.log('VPN Viewer Plugin: .basset element not found in #topbar.');
        }
    } else {
        console.log('VPN Viewer Plugin: #topbar element not found.');
    }
};

// Register the startup function. The name of the function must match the value of 'shortName' in config.json.
// In this case, it's 'vpnviewer'.
// We are assigning our plugin object to a global variable that MeshCentral will look for.
pluginHandler.vpnviewer = vpnViewerPlugin;