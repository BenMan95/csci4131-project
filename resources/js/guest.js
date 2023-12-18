for (let button of document.getElementsByClassName('button')) {
    button.addEventListener('click', async () => {
        location.href = '/login'
    })
}