import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconX } from '@tabler/icons-react-native';

interface Video {
    videoId: string;
    title: string;
    description: string;
    url: string;
    thumbnail?: string;
    duration?: string;
}

interface VideoSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (video: Video, index: number) => void;
    videos: Video[];
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
}

const { height } = Dimensions.get('window');

const VideoSelectModal: React.FC<VideoSelectModalProps> = ({
    visible,
    onClose,
    onSelect,
    videos,
    onLoadMore,
    isLoadingMore
}) => {
    const { colors } = useTheme();

    const renderItem = ({ item, index }: { item: Video, index: number }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onSelect(item, index)}
            activeOpacity={0.7}
        >
            <View style={styles.thumbnailContainer}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
                {item.duration && (
                    <View style={styles.durationOverlay}>
                        <Text style={styles.durationText}>{item.duration}</Text>
                    </View>
                )}
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={[styles.description, { color: colors.text }]} numberOfLines={3}>
                    {item.description}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <Text style={{ color: colors.text, opacity: 0.6 }}>Carregando mais...</Text>
            </View>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Select a Video</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            {/* @ts-ignore */}
                            <IconX size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={videos}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.videoId}-${index}`}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: height * 0.75,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150, 0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        height: 90,
    },
    thumbnailContainer: {
        width: 120,
        height: 90,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    durationOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    textContainer: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        opacity: 0.7,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});

export default VideoSelectModal;
