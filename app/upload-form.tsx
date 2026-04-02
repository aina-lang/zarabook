
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Upload, Book, User, Tag, FileText } from 'lucide-react-native';
import { telegramService } from '@/services/telegramService';
import { MetadataStore } from '@/core/storage/storage';
import * as FileStoreUtils from '@/core/storage/fileStore';

const C = {
  bg: '#0d0f14',
  card: '#1a1d24',
  tint: '#f97316',
  text: '#ffffff',
  muted: '#94a3b8',
  border: '#2d3139',
};

const CATEGORIES = [
  "Roman / Fiction",
  "Science-Fiction",
  "Fantasy",
  "Policier & Thriller",
  "Développement Personnel",
  "Business & Économie",
  "Informatique & Tech",
  "Cours & Éducation",
  "Santé & Bien-être",
  "Art & Design",
  "Histoire",
  "Autre"
];

export default function UploadForm() {
  const { uri, name, size } = useLocalSearchParams() as { uri: string; name: string; size: string };
  const router = useRouter();

  const [title, setTitle] = useState(name.split('.').slice(0, -1).join('.') || name);
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Autre');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un titre.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload vers Telegram via NestJS API
      const uploadRes = await telegramService.uploadFile(uri, name, category);
      
      // 2. Calcul du hash local pour l'ID unique si besoin
      const hash = await FileStoreUtils.FileStore.calculateHash(uri);

      // 3. Sauvegarde locale des métadonnées
      await MetadataStore.saveBook({
        id: `tg-${uploadRes.messageId || hash}`,
        title,
        author: author || 'Auteur inconnu',
        category,
        description,
        format: name.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize: parseInt(size, 10) || 0,
        hash: hash,
        telegramMessageId: uploadRes.messageId,
        thumbnailMessageId: uploadRes.thumbnailMessageId,
        addedAt: Date.now(),
        coverColor: '#' + Math.floor(Math.random()*16777215).toString(16),
      });

      Alert.alert("Succès", "Fichier ajouté au catalogue !");
      router.replace('/(tabs)');
    } catch (error) {
      console.error("[UploadForm] Erreur:", error);
      Alert.alert("Erreur", "Échec de l'upload. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={C.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du document</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Label icon={<Book size={16} color={C.tint} />} text="Titre du livre" />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Les Misérables"
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={styles.section}>
          <Label icon={<User size={16} color={C.tint} />} text="Auteur" />
          <TextInput
            style={styles.input}
            value={author}
            onChangeText={setAuthor}
            placeholder="Ex: Victor Hugo"
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={styles.section}>
          <Label icon={<Tag size={16} color={C.tint} />} text="Catégorie" />
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  category === cat && styles.catChipActive
                ]}
              >
                <Text style={[
                  styles.catText,
                  category === cat && styles.catTextActive
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Label icon={<FileText size={16} color={C.tint} />} text="Description (Optionnel)" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Un court résumé..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]} 
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Upload size={20} color="#fff" />
              <Text style={styles.uploadBtnText}>Confirmer & Envoyer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Label({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <View style={styles.labelRow}>
      {icon}
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  labelText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 15,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  catChipActive: { backgroundColor: C.tint + '22', borderColor: C.tint },
  catText: { color: C.muted, fontSize: 13 },
  catTextActive: { color: C.tint, fontWeight: 'bold' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  uploadBtn: {
    backgroundColor: C.tint,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
