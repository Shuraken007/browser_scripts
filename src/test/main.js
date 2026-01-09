import { GDrive } from '../services/g_drive.js'
import { is_url_match, AutoApprover } from '../services/oauth_user_approver.js'

async function main() {
   let creds = JSON.parse(G_CREDS)
   let client_id = creds.client_id
   if (is_url_match(client_id)) {
      let auto_approver = new AutoApprover(
         client_id, USER_MAIL
      )
      auto_approver.run()
   }
   else {
      let g_drive = new GDrive()
      // console.log(await g_drive.test_func(G_SYNC_FOLDER, 'food1.txt'))
      // console.log(await g_drive.test_func(G_SYNC_FOLDER, 'test.txt'))
      // console.log(await g_drive.create_folder('UserscriptsSync'))
      // console.log(await g_drive.load_file(G_SYNC_FOLDER, 'tests.json'))
      // await g_drive.upload_file(G_SYNC_FOLDER, 'test1.json', JSON.stringify({ one: 1, two: 2, inside: { three: 3, four: 4 } }, null, 3))
   }
}

main()