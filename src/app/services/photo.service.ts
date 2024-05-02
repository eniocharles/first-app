import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { CapacitorFlash } from '@capgo/capacitor-flash'; // Importe o CapacitorFlash

@Injectable({
  providedIn: 'root'
})

export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;


  // Adicione este método para ligar/desligar o flash
  public async toggleFlashlight() {
    const isAvailable = await CapacitorFlash.isAvailable();
    if (isAvailable.value) {
      const isOn = await CapacitorFlash.isSwitchedOn();
      if (isOn.value) {
        await CapacitorFlash.switchOff();
      } else {
        await CapacitorFlash.switchOn({ intensity: 1.0 });
      }
    } else {
      console.log('Flashlight not available on this device.');
    }
  }

  

  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
  
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });
  
    if (this.platform.is('hybrid')) {
      // Exiba uma nova imagem reescrevendo o caminho 'file://' para HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    }
    else {
    // Use webPath para exibir uma nova imagem em vez de base64, pois é já carregado na memória
      return {
        filepath: fileName,
        webviewPath: photo.webPath
      };
    }
  }
  private async readAsBase64(photo: Photo) {
    // "híbrido" detectará Cordova ou Capacitor
    if (this.platform.is('hybrid')) {
      //Leia o arquivo no formato base64
      const file = await Filesystem.readFile({
        path: photo.path!
      });
  
      return file.data;
    }
    else {
      //Busca a foto, lê como um blob e depois converte para o formato base64
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
  
      return await this.convertBlobToBase64(blob) as string;
    }
  }
  
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public async addNewToGallery() {
    // Tire uma foto
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri, // dados baseados em arquivo; proporciona melhor desempenho
      source: CameraSource.Camera, // tira automaticamente uma nova foto com a câmera
      quality: 100 //mais alta qualidade (0 a 100)
    });

    //Salve a imagem e adicione-a à coleção de fotos
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  public async loadSaved() {
    // Recupera dados de array de fotos em cache
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];
  
    // Maneira mais fácil de detectar ao executar na web: “quando a plataforma NÃO for híbrida, faça isso”
    if (!this.platform.is('hybrid')) {
      // Exiba a foto lendo no formato base64
      for (let photo of this.photos) {
        // Leia os dados de cada foto salva no sistema de arquivos
        const readFile = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
        });
  
        // Somente plataforma Web: carregue a foto como dados base64
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }
constructor(platform: Platform) {
  this.platform = platform;
}
}


export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}