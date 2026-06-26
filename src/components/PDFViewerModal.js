import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Modal } from 'react-native';
import Pdf from 'react-native-pdf';

export default function PDFViewerModal({ visible, pdfUrl, onClose, enquiryNumber }) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{enquiryNumber}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕ Close</Text>
                    </TouchableOpacity>
                </View>

                {pdfUrl ? (
                    <Pdf
                        source={{ uri: pdfUrl }}
                        style={styles.pdf}
                        onLoadComplete={(numberOfPages) => {
                            console.log(`PDF loaded with ${numberOfPages} pages`);
                        }}
                        onError={(error) => {
                            console.error('PDF Error:', error);
                        }}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No PDF to display</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#667eea',
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
