import { promises as fs } from 'fs';
import { JsonStorageService } from './json-storage.service';
import { logger } from '../util/logger';

// 1. On mock (simule) le module 'fs' et le logger pour ne pas écrire réellement
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('../util/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('JsonStorageService', () => {
  let service: JsonStorageService;
  
  // On récupère les versions mockées des fonctions pour pouvoir vérifier leurs appels
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    // 2. Avant chaque test, on instancie le service et on nettoie les mocks
    service = new JsonStorageService();
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('devrait créer le dossier et écrire le fichier JSON correctement', async () => {
      // ARRANGE
      const dummyData = { id: 1, name: 'Test' };
      // On simule que mkdir fonctionne
      mockedFs.mkdir.mockResolvedValue(undefined); 
      // On simule que writeFile fonctionne
      mockedFs.writeFile.mockResolvedValue(undefined); 

      // ACT
      await service.save(dummyData);

      // ASSERT
      // Vérifie que mkdir a été appelé avec l'option recursive
      expect(mockedFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('public'), { recursive: true });
      
      // Vérifie que writeFile a été appelé avec les bonnes données formatées
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('portfolio-data.json'), // Le chemin
        JSON.stringify(dummyData, null, 2),             // Le contenu
        'utf-8'                                         // L'encodage
      );

      // Vérifie que le logger a confirmé le succès
      expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('💾 Données sauvegardées'));
    });

    it('devrait logger une erreur et la relancer si l\'écriture échoue', async () => {
      // ARRANGE
      const errorMock = new Error('Disk full');
      mockedFs.mkdir.mockResolvedValue(undefined);
      // On simule une erreur lors de l'écriture
      mockedFs.writeFile.mockRejectedValue(errorMock);

      // ACT & ASSERT
      await expect(service.save({})).rejects.toThrow('Disk full');
      
      // Vérifie que l'erreur a bien été loggée
      expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('❌ Erreur'), errorMock);
    });
  });

  describe('read', () => {
    it('devrait retourner les données parsées si le fichier existe', async () => {
      // ARRANGE
      const storedData = { success: true };
      // On simule que readFile renvoie une chaîne JSON valide
      mockedFs.readFile.mockResolvedValue(JSON.stringify(storedData));

      // ACT
      const result = await service.read();

      // ASSERT
      expect(result).toEqual(storedData);
      expect(mockedFs.readFile).toHaveBeenCalledWith(expect.stringContaining('portfolio-data.json'), 'utf-8');
    });

    it('devrait retourner null si le fichier n\'existe pas (ou erreur de lecture)', async () => {
      // ARRANGE
      // On simule une erreur (ex: fichier introuvable)
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      // ACT
      const result = await service.read();

      // ASSERT
      expect(result).toBeNull();
      // On vérifie qu'on n'a PAS loggé d'erreur critique (car le catch renvoie juste null)
      // Si tu voulais logger une erreur dans ton catch, tu pourrais tester ça ici aussi.
    });
  });
});