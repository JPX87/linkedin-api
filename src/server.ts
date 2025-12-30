import express from 'express';
import cron from 'node-cron';
import cors from 'cors';
import { JsonStorageService } from './services/json-storage.service';
import { LinkedinProfileService } from './services/linkedin-profile.service';
import { logger } from './util/logger';

// Initialisation
export const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.LOCAL_LINKEDIN_API_TOKEN ?? ""

app.use(cors());
app.use(express.json());

const storageService = new JsonStorageService();
const linkedinService = new LinkedinProfileService();

// ROUTE API
app.get('/api/portfolio', async (_req, res) => {
  const data = await storageService.read();
  if (!data) {
    return res.status(404).json({ message: "Aucune donnée générée pour le moment." });
  }
  return res.json(data);
});

// FONCTION DE MISE À JOUR DES DONNÉES
export const updatePortfolioData = async () => {
  logger.info('🔄 Démarrage du Cron : Mise à jour des données LinkedIn...');
  try {
    // Récupération des données via le service
    const profileData = await linkedinService.getLinkedinProfile(TOKEN);
    
    // Sauvegarde dans le JSON
    await storageService.save(profileData);
    
    logger.info('✅ Cron terminé : Données mises à jour avec succès.');
  } catch (error) {
    logger.error('❌ Erreur critique durant le Cron', error);
  }
};

// PLANIFICATION DU CRON
// Tous les heures ("0 * * * *")
export const initScheduler = () => {
  cron.schedule('0 * * * *', () => {
    updatePortfolioData();
  });
  logger.info('⏰ Tâche Cron planifiée (toutes les heures).');
};

// DÉMARRAGE DU SERVEUR
// Permet de lancer le serveur uniquement si ce fichier est exécuté directement
if (require.main === module) {
  
  initScheduler();

  // LANCEMENT DU SERVEUR
  app.listen(PORT, async () => {
      // Mise à jour au démarrage pour ne pas attendre le premier cron
      await updatePortfolioData(); 

      logger.info(`🚀 Serveur API lancé sur http://localhost:${PORT}`);
  });
}