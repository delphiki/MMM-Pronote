/**  MMM-Pronote addon  **/
/**  permet de changer de compte si vous avez plusieures enfants **/
/**  @bugsounet  **/

var recipe = {
  transcriptionHooks: {
    "PRONOTE_ACCOUNT": {
      pattern: "pronote (.*)",
      command: "PRONOTE_ACCOUNT"
    },
  },

  commands: {
    "PRONOTE_ACCOUNT": {
      notificationExec: {
        notification: "PRONOTE_ACCOUNT",
        payload: (params) => {
          return params[1]
        }
      },
      soundExec: {
        chime: "open"
      }
    }
  }
}
exports.recipe = recipe
