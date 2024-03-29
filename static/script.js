const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const croppedCanvas = document.getElementById('croppedCanvas');
const croppedCtx = croppedCanvas.getContext('2d');
const segmentedCanvas = document.getElementById('segmentedCanvas');
const segmentedCtx = segmentedCanvas.getContext('2d');
let drawing = false;
let bbox = {};
// Variable to store animation frame ID
let animationFrameId;

// Event listeners for drawing bounding box
canvas.addEventListener('mousedown', startDrawing);
document.addEventListener('mousemove', draw);
document.addEventListener('mouseup', stopDrawing);

function startDrawing(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    bbox = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        width: 0,
        height: 0
    };
    
    // Draw the selected image on the canvas
    drawImageOnCanvas();
}

function draw(e) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    bbox.width = e.clientX - rect.left - bbox.x;
    bbox.height = e.clientY - rect.top - bbox.y;

    // Clear canvas and draw bounding box
    clearCanvas();
    drawBoundingBox();

    // Draw the selected image on the canvas
    drawImageOnCanvas();
}

function drawCroppedImage() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // Clear the canvas
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);

                // Fill the canvas with black
                croppedCtx.fillStyle = '#000000'; // Set fill color to black
                croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height); // Fill the canvas with black

                // Draw the cropped region on the second canvas within the bounding box area
                croppedCtx.drawImage(
                    img,
                    bbox.x, bbox.y, bbox.width, bbox.height, // Source rectangle (cropped region)
                    bbox.x, bbox.y, bbox.width, bbox.height // Destination rectangle (within bounding box)
                );
                
                // Draw the rest of the image into only the bounding box region, and rest will be black only
                drawImageOnCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function stopDrawing() {
    drawing = false;
    // Update the hidden input field with the bounding box coordinates
    document.getElementById('bbox').value = `${bbox.x},${bbox.y},${bbox.width},${bbox.height}`;
    // Draw the cropped region on the second canvas
    drawCroppedImage();
}

function drawImageOnCanvas() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // Draw the original image on the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Draw the bounding box
                drawBoundingBox();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function clearCanvas() {
    // Clear only the bounding box region
    ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
}

function drawBoundingBox() {
    const x1 = bbox.x;
    const y1 = bbox.y;
    const x2 = bbox.x + bbox.width;
    const y2 = bbox.y + bbox.height;

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y2);
    ctx.closePath();
    ctx.stroke();
}

function processAndUploadImage() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];

    const formData = new FormData();
    formData.append('image', file);
    formData.append('bbox', document.getElementById('bbox').value);

    // Clear previous result
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = '';
    resultElement.classList.remove('result-visible');

    // Update the URL to point to your local Flask server and the correct endpoint (/process)
    fetch('http://localhost:5000/process', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const classResult = document.createElement('div');

        // Display predicted class index
        classResult.innerHTML = `Predicted Class Index: ${data.predictedClass}`;

        // Display predicted class name
        if (data.className) {
            const classNameResult = document.createElement('div');
            classNameResult.innerHTML = `Predicted Class Name: ${data.className}`;
            resultElement.appendChild(classNameResult);
        }

        resultElement.appendChild(classResult);
        resultElement.classList.add('result-visible');

        // Display the segmented image on the third canvas
        const img = new Image();
        img.onload = function () {
            // Clear the third canvas before drawing the new image
            segmentedCtx.clearRect(0, 0, segmentedCanvas.width, segmentedCanvas.height);

            // Draw the segmented image
            segmentedCtx.drawImage(img, 0, 0, segmentedCanvas.width, segmentedCanvas.height);
        };
        img.src = 'data:image/jpeg;base64,' + data.segmented_image;

        // Check if classification result is defined and successful
        if (data.classification_result && data.classification_result.success) {
            console.log('Predicted Class Index:', data.classification_result.predictedClass);
            console.log('Predicted Class Name:', data.classification_result.className);

            // Create elements to display the classification result
            const classResult = document.createElement('div');
            classResult.innerHTML = `Predicted Class Index: ${data.classification_result.predictedClass}`;

            if (data.classification_result.className) {
                const classNameResult = document.createElement('div');
                classNameResult.innerHTML = `Predicted Class Name: ${data.classification_result.className}`;
                resultElement.appendChild(classNameResult);
            }

            resultElement.appendChild(classResult);
            resultElement.classList.add('result-visible');
        } else {
            console.error('Classification error:', data.classification_result.error);
        }
    })
    .catch(error => console.error('Error:', error));

    // Draw the original image on the canvas immediately after uploading
    drawImageOnCanvas();
}


