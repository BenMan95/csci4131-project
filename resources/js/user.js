for (let button of document.getElementsByClassName('like')) {
    button.addEventListener('click', async (event) => {
        let src = event.target
        let classes = src.classList
        let liked = classes.contains('liked')

        // Construct request to toggle liked status
        let request = {
            id: src.getAttribute('data-id'),
            status: !liked
        }

        // Make request to change like status
        let response = await fetch('/api/like', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(request)
        })

        // Update DOM if liked/unliked
        if (response.ok) {
            let likes = parseInt(src.innerText)
            if (liked) {
                src.innerText = likes == 2 ? '1 like' : `${likes-1} likes`
                classes.remove('liked')
            } else {
                src.innerText = likes == 0 ? '1 like' : `${likes+1} likes`
                classes.add('liked')
            }
        }
    })
}

for (let button of document.getElementsByClassName('delete')) {
    button.addEventListener('click', async (event) => {
        let src = event.target

        // Construct request to delete post
        let request = {
            id: src.getAttribute('data-id')
        }

        // Make request to delete post
        let response = await fetch('/api/post', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(request)
        })

        // Update DOM if deleted or doesn't exist
        if (response.ok || response.status == 404) {
            location.reload()
        }
    })
}