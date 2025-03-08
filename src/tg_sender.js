export class TgSender {

   validate_TG_CONFIG() {
      if (!TG_CONFIG) {
         console.log('telegram config not defined');
         return false
      }
      if (!TG_CONFIG.chat_id) {
         console.log('telegram config chat_id not defined');
         return false
      }
      if (!TG_CONFIG.token) {
         console.log('telegram config token_id not defined');
         return false
      }
      return true
   }

   constructor(chat_id, token) {
      this.on = this.validate_TG_CONFIG()
   }
   async send(data) {
      if (!this.on) return

      var enc_data = JSON.stringify(data);
      var blob = new Blob([enc_data], { type: 'plain/text' });

      var formData = new FormData();
      formData.append('chat_id', TG_CONFIG.chat_id);
      formData.append('document', blob, 'file.json');

      var request = new XMLHttpRequest();
      request.open('POST', `https://api.telegram.org/bot${TG_CONFIG.token}/sendDocument`);
      request.send(formData);
   }
}