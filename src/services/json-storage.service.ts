import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../util/logger';

export class JsonStorageService {
  // Chemin vers le fichier public (ex: à la racine ou dans un dossier public)
  private readonly filePath = path.join(process.cwd(), 'public', 'portfolio-data.json');

  constructor() {}

  async save(data: any): Promise<void> {
    try {
      // S'assurer que le dossier existe
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.info(`💾 Données sauvegardées dans ${this.filePath}`);
    } catch (error) {
      logger.error('❌ Erreur lors de l\'écriture du JSON', error);
      throw error;
    }
  }

  async read(): Promise<any> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Si le fichier n'existe pas encore, on renvoie null ou un objet vide
      return null;
    }
  }
}