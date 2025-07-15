const STORAGE_KEY = "simple_mmo_storage"

class Storage {
   constructor() {
      let storage = {
         quests: {},
         my_stats: {},
         task: {},
      }

      let loaded_storage = localStorage.getItem(STORAGE_KEY);

   }
}