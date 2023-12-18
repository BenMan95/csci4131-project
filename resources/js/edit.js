const contentInput = document.getElementById('content')
const submitButton = document.getElementById('submit')

submitButton.addEventListener('click', async (event) => {
    // Construct request to edit post
    let request = {
        id: contentInput.getAttribute('data-id'),
        content: contentInput.value
    }

    // Make request to edit post
    let response = await fetch('/api/post', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(request)
    })

    // Redirect if successful
    if (response.ok) {
        location.href = submitButton.getAttribute('data-redirect')
    }
})