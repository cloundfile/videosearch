import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "@react-navigation/native"
import InputPanel from "@/components/panel-input"

import Services from "@/services/service"
import VideoSelectModal from "@/components/video-select-modal"
import VideoActions from '@/components/video-actions';
import { Alert, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native"
import { useState, useCallback } from "react"

import VideoPlayer from "@/components/video-player"
import DownloadService from "@/services/download-service";

const Transcribe = () => {
    const [url, setUrl] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [transcription, setTranscription] = useState('');
    const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined);
    const [loadingType, setLoadingType] = useState<'video' | 'music' | 'transcript' | null>(null);
    const [downloadStatus, setDownloadStatus] = useState<string>('');
    const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
    const [continuationToken, setContinuationToken] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isVertical, setIsVertical] = useState(false);
    const { colors } = useTheme();

    const parseCaptions = useCallback((xmlString: string) => {
        try {
            const regex = /<p[^>]*>([\s\S]*?)<\/p>/g;
            let match;
            const texts = [];
            while ((match = regex.exec(xmlString)) !== null) {
                const cleanText = match[1].replace(/<[^>]+>/g, '').trim();
                if (cleanText) texts.push(cleanText);
            }
            return texts.join(' ');
        } catch (e) {
            return xmlString;
        }
    }, []);

    const processVideo = useCallback(async (videoId: string, apiKey: string, isShort?: boolean) => {
        console.log('[Transcribe] processVideo: videoId=', videoId, 'isShort=', isShort);
        setIsVertical(!!isShort);
        setSelectedVideoId(videoId);
        setTranscription('');

        const data = await Services.getVideoDetails(videoId, apiKey);
        if (data) {
            if (data.captions && data.captions.length > 0) {
                const ptBrCaption = data.captions.find((c: any) => c.vssId.includes('pt-BR') || c.languageCode === 'pt-BR');
                const selectedCaption = ptBrCaption || data.captions[0];
                const captionRaw = await Services.getCaptionContent(selectedCaption.baseUrl);

                if (captionRaw) {
                    const cleanText = parseCaptions(captionRaw);
                    setTranscription(cleanText);
                    console.log('[Transcribe] Captions loaded');
                }
            } else {
                setTranscription('No captions found for this video.');
                console.log('[Transcribe] No captions found');
            }
        } else {
            console.error('[Transcribe] Failed to get video details');
            Alert.alert('Error', 'Failed to get video details.');
        }
    }, [parseCaptions]);

    const handleVideoSelect = useCallback(async (video: any, index?: number) => {
        console.log('[Transcribe] handleVideoSelect: videoId=', video.videoId);
        setModalVisible(false);
        const isShort = video.isShort ||
            video.title?.toLowerCase().includes('shorts') ||
            video.url?.toLowerCase().includes('shorts/') ||
            video.duration?.includes(':') === false;

        setSelectedVideoId(video.videoId);
        setLoading(true);
        setLoadingType(null);
        setDownloadProgress(undefined);
        setDownloadStatus('');
        if (typeof index === 'number') {
            setCurrentIndex(index);
        }
        try {
            const apiKey = await Services.getCredentials();
            if (apiKey) {
                await processVideo(video.videoId, apiKey, isShort);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred.');
        } finally {
            setLoading(false);
        }
    }, [processVideo, lastSearchQuery, searchResults.length]);

    const handlePlayNext = useCallback(async () => {
        if (searchResults.length > 0) {
            if (currentIndex < searchResults.length - 1) {
                const nextIndex = currentIndex + 1;
                const nextVideo = searchResults[nextIndex];
                await handleVideoSelect(nextVideo, nextIndex);
            } else if (continuationToken) {
                console.log('[Transcribe] Reached end of list, loading more for auto-play...');
                const newVideos = await handleLoadMore();
                if (newVideos && newVideos.length > 0) {
                    const nextIndex = currentIndex + 1;
                    const nextVideo = newVideos[0];
                    await handleVideoSelect(nextVideo, nextIndex);
                }
            }
        }
    }, [searchResults, currentIndex, continuationToken, handleVideoSelect]);

    const handleLoadMore = useCallback(async () => {
        if (!continuationToken || isLoadingMore) {
            console.log('[Transcribe] Sem token ou já carregando mais. Token:', !!continuationToken);
            return [];
        }

        console.log('[Transcribe] Carregando mais resultados... Token:', continuationToken.substring(0, 10) + '...');
        setIsLoadingMore(true);
        try {
            const apiKey = await Services.getCredentials();
            if (apiKey) {
                const results = await Services.searchVideosNext(continuationToken, apiKey);
                if (results?.items?.length > 0) {
                    console.log(`[Transcribe] Mais ${results.items.length} vídeos carregados. Novo token:`, !!results.continuation);
                    setSearchResults(prev => [...prev, ...results.items]);
                    setContinuationToken(results.continuation || null);
                    return results.items;
                } else {
                    console.log('[Transcribe] Nenhum vídeo novo retornado. Data:', JSON.stringify(results));
                    setContinuationToken(null);
                }
            }
        } catch (error) {
            console.error('[Transcribe] Erro ao carregar mais vídeos:', error);
        } finally {
            setIsLoadingMore(false);
        }
        return [];
    }, [continuationToken, isLoadingMore]);

    const handleDownload = async () => {
        if (!selectedVideoId) return;
        setLoadingType('video');
        setDownloadProgress(0);
        setDownloadStatus('loading...');
        try {
            const path = await DownloadService.baixarVideo(
                selectedVideoId,
                (status: string) => setDownloadStatus(status),
                (percent: number) => {
                    setDownloadProgress(percent);
                    setDownloadStatus('downloading');
                }
            );
            if (path) Alert.alert('Success', `Video saved at: ${path}`);
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Erro', `Falha no download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoadingType(null);
            setDownloadProgress(undefined);
            setDownloadStatus('');
        }
    };

    const handleAudio = async () => {
        if (!selectedVideoId) return;
        setLoadingType('music');
        setDownloadProgress(0);
        setDownloadStatus('Iniciando...');

        console.log(`[Transcribe] Iniciando download de áudio para videoId: ${selectedVideoId}`);

        try {
            const path = await DownloadService.downloadYoutubeAudio(
                selectedVideoId,
                (status: string) => {
                    console.log(`[Transcribe] Job Status: ${status}`);
                    setDownloadStatus(status);
                },
                (percent: number) => {
                    setDownloadProgress(percent);
                    setDownloadStatus('Baixando áudio...');
                }
            );

            if (path) {
                console.log(`[Transcribe] Áudio salvo com sucesso em: ${path}`);
                Alert.alert('Sucesso', `Áudio salvo em:\n${path}`);
            }
        } catch (error: any) {
            console.error('[Transcribe] Erro no download de áudio:', error);
            Alert.alert('Erro no Download', error.message || 'Falha desconhecida');
        } finally {
            setLoadingType(null);
            setDownloadProgress(undefined);
            setDownloadStatus('');
        }
    };

    const handleTranscribe = async () => {
        if (!selectedVideoId) return;
        setLoadingType('transcript');
        setDownloadProgress(0);
        setDownloadStatus('Iniciando...');
        setTranscription(''); // Clear previous transcription
        console.log(`[Transcribe] Iniciando processo para videoId: ${selectedVideoId}`);

        try {
            const { text } = await DownloadService.baixarTranscricao(
                selectedVideoId,
                (status: string) => {
                    console.log(`[Transcribe] Status: ${status}`);
                    setDownloadStatus(status);
                },
                (percent: number) => {
                    setDownloadProgress(percent);
                    setDownloadStatus('Baixando áudio...');
                }
            );
            if (text) {
                setTranscription(text);
            }
        } catch (error) {
            console.error('Transcription error:', error);
            Alert.alert('Erro', `Falha na transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setLoadingType(null);
            setDownloadProgress(undefined);
            setDownloadStatus('');
        }
    };

    const handleSubmit = async () => {
        if (!url) return;

        // If it's the same search and we already have results, just show the modal
        if (url === lastSearchQuery && searchResults.length > 0) {
            setModalVisible(true);
            return;
        }

        setLoading(true);
        setSelectedVideoId(null);
        setCurrentIndex(-1);
        setTranscription('');
        setLoadingType(null);
        setDownloadProgress(undefined);
        setDownloadStatus('');
        setContinuationToken(null);
        setSearchResults([]);

        try {
            const apiKey = await Services.getCredentials();
            if (apiKey) {
                const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                const videoId = videoIdMatch ? videoIdMatch[1] : null;

                if (videoId) {
                    const isShort = url.toLowerCase().includes('shorts');
                    await processVideo(videoId, apiKey, isShort);
                    setLastSearchQuery(url);
                } else {
                    const results = await Services.searchVideos(url, apiKey);
                    if (results?.items?.length > 0) {
                        setSearchResults(results.items);
                        setContinuationToken(results.continuation || null);
                        setLastSearchQuery(url);
                        setModalVisible(true);
                    } else {
                        Alert.alert('Info', 'Nenhum vídeo encontrado.');
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ paddingVertical: 12 }}>
                    <InputPanel
                        input={{
                            placeholder: 'Enter YouTube URL or Search',
                            value: url,
                            onChangeText: setUrl,
                            autoCapitalize: 'none',
                            autoCorrect: false,
                            onSubmitEditing: handleSubmit,
                            returnKeyType: 'search'
                        }}
                        button={{
                            title: 'Transcribe / Search',
                            onPress: handleSubmit,
                            loading: loading,
                            disabled: !url
                        }}
                    />
                </View>

                <View style={{ backgroundColor: colors.card, borderRadius: 12, marginHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    <VideoPlayer
                        videoId={selectedVideoId || ""}
                        backgroundColor={colors.card}
                        onVideoEnd={handlePlayNext}
                        isVertical={isVertical}
                    />
                </View>

                {selectedVideoId && (
                    <View style={{ marginTop: 8 }}>
                        <VideoActions
                            onDownload={handleDownload}
                            onAudio={handleAudio}
                            onTranscribe={handleTranscribe}
                            loadingType={loadingType}
                            progress={downloadProgress}
                            status={downloadStatus}
                        />
                    </View>
                )}

                {transcription ? (
                    <View style={{ padding: 16, margin: 16, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Transcription:</Text>
                        <Text style={{ color: colors.text, lineHeight: 22 }}>{transcription}</Text>
                    </View>
                ) : (
                    !selectedVideoId && !loading && (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 }}>
                            <Text style={{ color: colors.text, opacity: 0.5, textAlign: 'center', fontSize: 16 }}>
                                Digite uma URL do YouTube ou pesquise para começar.
                            </Text>
                        </View>
                    )
                )}
            </ScrollView>

            <VideoSelectModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSelect={handleVideoSelect}
                videos={searchResults}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
            />
        </SafeAreaView>
    )
}

export default Transcribe