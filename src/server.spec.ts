import request from 'supertest';
import cron from 'node-cron';
import { app, initScheduler, updatePortfolioData } from './server'; // On importe l'app et la fonction
import { JsonStorageService } from './services/json-storage.service';
import { LinkedinProfileService } from './services/linkedin-profile.service';
import { logger } from './util/logger';

// 1. MOCK DES DÉPENDANCES
// On dit à Jest de remplacer ces fichiers par des versions fausses (mocks)
jest.mock('./services/json-storage.service');
jest.mock('./services/linkedin-profile.service');
jest.mock('./util/logger');
jest.mock('node-cron', () => ({
  schedule: jest.fn(), // On mock schedule pour vérifier qu'il est appelé
}));

describe('Server & API', () => {
    // Récupération des mocks typés pour pouvoir manipuler leurs retours
    const MockedStorage = JsonStorageService as jest.MockedClass<typeof JsonStorageService>;
    const MockedLinkedinService = LinkedinProfileService as jest.MockedClass<typeof LinkedinProfileService>;
    const mockedLogger = logger as jest.Mocked<typeof logger>;

    // Variables pour stocker les instances mockées (créées automatiquement par new Class())
    let storageInstance: jest.Mocked<JsonStorageService>;
    let linkedinInstance: jest.Mocked<LinkedinProfileService>;

    beforeAll(() => {
        // On capture les instances UNE SEULE FOIS, juste après l'import du serveur.
        // Car le serveur est un "Singleton" (il ne recrée pas les services à chaque requête).
        storageInstance = MockedStorage.mock.instances[0] as jest.Mocked<JsonStorageService>;
        linkedinInstance = MockedLinkedinService.mock.instances[0] as jest.Mocked<LinkedinProfileService>;
    });

    beforeEach(() => {
        // On nettoie l'historique des appels (toHaveBeenCalledTimes, etc.)
        // Mais on ne perd pas nos références aux instances capturées dans beforeAll
        jest.clearAllMocks();
    });
    describe('GET /api/portfolio', () => {
        it('devrait retourner 200 et les données si elles existent', async () => {
        // ARRANGE
        const fakeData = { user: 'Manfred' };
        // On force la méthode read() de l'instance mockée à renvoyer nos fakeData
        storageInstance.read.mockResolvedValue(fakeData);

        // ACT
        const response = await request(app).get('/api/portfolio');

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.body).toEqual(fakeData);
        expect(storageInstance.read).toHaveBeenCalledTimes(1);
        });

        it('devrait retourner 404 si aucune donnée n\'existe (null)', async () => {
        // ARRANGE
        storageInstance.read.mockResolvedValue(null);

        // ACT
        const response = await request(app).get('/api/portfolio');

        // ASSERT
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: "Aucune donnée générée pour le moment." });
        });
    });

    describe('Logique de mise à jour (updatePortfolioData)', () => {
        it('devrait récupérer le profil et le sauvegarder avec succès', async () => {
        // ARRANGE
        const fakeProfile = { name: 'Test Profile' };
        linkedinInstance.getLinkedinProfile.mockResolvedValue(fakeProfile as any);
        storageInstance.save.mockResolvedValue(undefined);

        // ACT
        await updatePortfolioData();

        // ASSERT
        expect(linkedinInstance.getLinkedinProfile).toHaveBeenCalled();
        expect(storageInstance.save).toHaveBeenCalledWith(fakeProfile);
        expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('✅ Cron terminé'));
        });

        it('devrait logger une erreur critique si le service LinkedIn échoue', async () => {
        // ARRANGE
        const error = new Error('API Down');
        linkedinInstance.getLinkedinProfile.mockRejectedValue(error);

        // ACT
        await updatePortfolioData();

        // ASSERT
        // On vérifie que save n'a PAS été appelé
        expect(storageInstance.save).not.toHaveBeenCalled();
        // On vérifie que l'erreur a été loggée
        expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('❌ Erreur critique'), error);
        });
    });

    describe('Planification Cron', () => {
    it('devrait avoir planifié une tâche cron lorsqu\'on initialise le scheduler', () => {
      // ACT : On déclenche manuellement la planification
      initScheduler();

      // ASSERT : Maintenant le compteur est à 1 (car appelé dans ce test)
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });
  });
});