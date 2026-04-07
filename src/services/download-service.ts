import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';
import { Alert, Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

const BASE_URL = 'https://media.dnsbr.shop';

export type JobStatus = 'queued' | 'running' | 'done' | 'finish' | 'error';
type MediaType = 'video' | 'audio' | 'transcription';
type TranscriptFormat = 'txt' | 'srt';

class DownloadService {
    static isValidVideoId(id: string) {
        return /^[A-Za-z0-9_-]{11}$/.test(id);
    }

    static async requestPermissions() {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted' && status !== 'undetermined') {
                Alert.alert(
                    'Permissão Necessária',
                    'Este app precisa de acesso à galeria para salvar vídeos e áudios.'
                );
                return false;
            }
            return true;
        } catch (e) {
            console.error('Erro ao solicitar permissão:', e);
            return false;
        }
    }

    static async createJob(params: { videoId: string }): Promise<string> {
        const { videoId } = params;
        if (!this.isValidVideoId(videoId)) throw new Error('videoId inválido (deve ter 11 caracteres)');

        console.log(`[DownloadService] Criando job para videoId: ${videoId}`);
        const res = await fetch(`${BASE_URL}/video/${videoId}`, {
            method: 'POST',
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[DownloadService] Erro ao criar job: ${res.status} - ${text}`);
            throw new Error(`Erro ao iniciar processamento (${res.status})`);
        }

        const data = await res.json();
        if (!data?.jobId) throw new Error('Resposta do servidor não contém jobId');

        console.log(`[DownloadService] Job criado: ${data.jobId}`);
        return data.jobId;
    }

    static async waitJobDone(
        jobId: string,
        onStatus?: (status: JobStatus) => void
    ) {
        const maxAttempts = 240; // 8 minutos (240 * 2s)
        const pollingInterval = 2000;
        let networkRetries = 0;
        const maxNetworkRetries = 3;

        console.log(`[DownloadService] Iniciando polling para job: ${jobId}`);

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const res = await fetch(`${BASE_URL}/status/${jobId}`);

                if (!res.ok) {
                    throw new Error(`HTTP Error ${res.status}`);
                }

                const job = await res.json();
                const status = (job?.status || 'error') as JobStatus;

                console.log(`[DownloadService] Status do job ${jobId}: ${status} (tentativa ${i + 1})`);
                onStatus?.(status);

                if (status === 'done' || status === 'finish') {
                    console.log(`[DownloadService] Job ${jobId} concluído com sucesso`);
                    return job;
                }
                if (status === 'error') {
                    const errMsg = job?.error || 'Erro desconhecido no processamento';
                    console.error(`[DownloadService] Erro no job ${jobId}: ${errMsg}`);
                    throw new Error(errMsg);
                }

                // Reset network retries on success
                networkRetries = 0;
            } catch (e: any) {
                networkRetries++;
                console.warn(`[DownloadService] Falha na rede/polling (${networkRetries}/${maxNetworkRetries}):`, e.message);

                if (networkRetries >= maxNetworkRetries) {
                    console.error('[DownloadService] Limite de retentativas de rede atingido');
                    throw new Error('Falha de conexão persistente com o servidor');
                }
            }

            await new Promise((r) => setTimeout(r, pollingInterval));
        }

        console.error(`[DownloadService] Timeout de 8 minutos atingido para o job ${jobId}`);
        throw new Error('O processamento demorou demais (timeout de 8 min)');
    }

    static async downloadJobFile(params: {
        jobId: string;
        videoId: string;
        type: MediaType;
        extension?: string;
        suggestedFilename?: string;
        onProgress?: (percent: number) => void;
    }) {
        const { jobId, videoId, type, extension = 'mp3', suggestedFilename, onProgress } = params;

        // Use suggestedFilename or fallback to videoId
        let baseName = suggestedFilename || videoId;

        // Remove existing extension from baseName if present
        baseName = baseName.replace(/\.[^/.]+$/, "");

        const filename = `${baseName}.${extension}`;

        const toFile =
            Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/${filename}`
                : `${RNFS.DocumentDirectoryPath}/${filename}`;

        console.log(`[DownloadService] Iniciando download do arquivo para: ${toFile}`);

        const options = {
            fromUrl: `${BASE_URL}/download/${jobId}`,
            toFile,
            background: true,
            discretionary: true,
            progressInterval: 500,
            progress: (res: any) => {
                if (!onProgress || !res.contentLength || res.contentLength <= 0) return;
                const percentage = (res.bytesWritten / res.contentLength) * 100;
                onProgress(Number(percentage.toFixed(1)));
            },
        };

        const result = await RNFS.downloadFile(options).promise;

        if (result.statusCode !== 200) {
            console.error(`[DownloadService] Erro no download do arquivo: HTTP ${result.statusCode}`);
            throw new Error(`Erro ao baixar arquivo final (Status ${result.statusCode})`);
        }

        console.log(`[DownloadService] Download concluído: ${toFile}`);
        return toFile;
    }

    /**
     * Fluxo completo para baixar áudio do YouTube
     */
    static async downloadYoutubeAudio(
        videoId: string,
        onStatus?: (s: JobStatus) => void,
        onProgress?: (p: number) => void
    ): Promise<string> {
        try {
            const jobId = await this.createJob({ videoId });
            const job = await this.waitJobDone(jobId, onStatus);
            const path = await this.downloadJobFile({
                jobId,
                videoId,
                type: 'audio',
                extension: 'mp3',
                suggestedFilename: job?.filename,
                onProgress
            });
            return path;
        } catch (error: any) {
            console.error('[DownloadService] Erro no fluxo downloadYoutubeAudio:', error.message);
            throw error;
        }
    }

    // Mantendo compatibilidade com métodos antigos mas redirecionando
    static async baixarMp3(
        videoId: string,
        onStatus?: (s: JobStatus) => void,
        onProgress?: (p: number) => void
    ) {
        return this.downloadYoutubeAudio(videoId, onStatus, onProgress);
    }

    static async baixarVideo(
        videoId: string,
        onStatus?: (s: JobStatus) => void,
        onProgress?: (p: number) => void
    ) {
        const jobId = await this.createJob({ videoId });
        const job = await this.waitJobDone(jobId, onStatus);
        const path = await this.downloadJobFile({
            jobId,
            videoId,
            type: 'video',
            extension: 'mp4',
            suggestedFilename: job?.filename,
            onProgress
        });

        if (path && Platform.OS !== 'web') {
            if (await this.requestPermissions()) {
                await MediaLibrary.saveToLibraryAsync(`file://${path}`);
            }
        }

        return path;
    }

    static async baixarTranscricao(
        videoId: string,
        onStatus?: (s: JobStatus) => void,
        onProgress?: (p: number) => void
    ): Promise<{ path: string; text: string }> {
        console.log(`[DownloadService] Iniciando transcrição local para videoId: ${videoId}`);

        // 1. Download MP3 first
        onStatus?.('running');
        const audioPath = await this.downloadYoutubeAudio(videoId, onStatus, onProgress);

        console.log(`[DownloadService] Áudio baixado com sucesso: ${audioPath}`);

        // Ensure file exists
        const exists = await RNFS.exists(audioPath);
        if (!exists) {
            throw new Error(`Arquivo de áudio não encontrado em: ${audioPath}`);
        }

        onStatus?.('running');

        // 2. Transcribe locally
        return new Promise((resolve, reject) => {
            let fullText = '';
            let resolved = false;

            const startTranscription = async () => {
                try {
                    console.log(`[DownloadService] Solicitando permissões de reconhecimento...`);
                    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                    if (!result.granted) {
                        throw new Error('Permissão de microfone/reconhecimento negada');
                    }

                    console.log(`[DownloadService] Configurando listeners de transcrição...`);

                    const removeListener = ExpoSpeechRecognitionModule.addListener("result", (event) => {
                        if (event.results && event.results.length > 0) {
                            fullText = event.results[0].transcript;
                            console.log(`[DownloadService] Evento 'result': ${fullText.substring(0, 50)}...`);
                        }
                    });

                    const removeErrorListener = ExpoSpeechRecognitionModule.addListener("error", (event) => {
                        console.error(`[DownloadService] Evento 'error':`, event.error, event.message);
                        cleanup();
                        if (!resolved) {
                            resolved = true;
                            reject(new Error(`Erro na transcrição: ${event.error}${event.message ? ' - ' + event.message : ''}`));
                        }
                    });

                    const removeEndListener = ExpoSpeechRecognitionModule.addListener("end", async () => {
                        console.log(`[DownloadService] Evento 'end' recebido`);
                        cleanup();
                        if (!resolved) {
                            resolved = true;
                            resolve({ path: '', text: fullText });
                        }
                    });

                    const cleanup = () => {
                        console.log(`[DownloadService] Limpando listeners...`);
                        removeListener.remove();
                        removeErrorListener.remove();
                        removeEndListener.remove();
                    };

                    console.log(`[DownloadService] Iniciando ExpoSpeechRecognitionModule.start com uri: file://${audioPath}`);

                    ExpoSpeechRecognitionModule.start({
                        lang: "pt-BR",
                        requiresOnDeviceRecognition: true, // Safeguard for better stability on some devices
                        audioSource: {
                            uri: `file://${audioPath}`
                        }
                    });

                } catch (err) {
                    console.error(`[DownloadService] Erro ao iniciar transcrição:`, err);
                    if (!resolved) {
                        resolved = true;
                        reject(err);
                    }
                }
            };

            startTranscription();
        });
    }

    static async shareFile(uri: string) {
        try {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error('Erro ao compartilhar arquivo:', error);
        }
    }
}

export default DownloadService;