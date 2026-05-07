let currentUser = null

module.exports = {
  set: (user) => { currentUser = user },
  get: () => currentUser,
  clear: () => { currentUser = null },
}
