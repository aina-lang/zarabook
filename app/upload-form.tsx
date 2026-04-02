
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Upload, Book, User, Tag, FileText } from 'lucide-react-native';
import { telegramService } from '@/services/telegramService';
import { MetadataStore } from '@/core/storage/storage';
import * as FileStoreUtils from '@/core/storage/fileStore';

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
      const uploadRes = await telegramService.uploadFile(uri, name, category, author, description);
      const hash = await FileStoreUtils.FileStore.calculateHash(uri);

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
    <View className="flex-1 bg-[#0d0f14]">
      {/* Header */}
      <View className="pt-14 pb-5 bg-[#1a1d24] flex-row items-center justify-between px-5 border-b border-[#2d3139]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 justify-center">
          <ChevronLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text className="text-[#ffffff] text-lg font-bold">Détails du document</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-5" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View className="mb-6">
          <Label icon={<Book size={16} color="#f97316" />} text="Titre du livre" />
          <TextInput
            className="bg-[#1a1d24] rounded-xl p-4 text-[#ffffff] text-base border border-[#2d3139]"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Les Misérables"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Author */}
        <View className="mb-6">
          <Label icon={<User size={16} color="#f97316" />} text="Auteur" />
          <TextInput
            className="bg-[#1a1d24] rounded-xl p-4 text-[#ffffff] text-base border border-[#2d3139]"
            value={author}
            onChangeText={setAuthor}
            placeholder="Ex: Victor Hugo"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Category */}
        <View className="mb-6">
          <Label icon={<Tag size={16} color="#f97316" />} text="Catégorie" />
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-3 py-2 rounded-full border ${category === cat ? 'bg-[#f97316]/20 border-[#f97316]' : 'bg-[#1a1d24] border-[#2d3139]'}`}
              >
                <Text className={`text-[13px] ${category === cat ? 'text-[#f97316] font-bold' : 'text-[#94a3b8]'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Label icon={<FileText size={16} color="#f97316" />} text="Description (Optionnel)" />
          <TextInput
            className="bg-[#1a1d24] rounded-xl p-4 text-[#ffffff] text-base border border-[#2d3139] h-24 text-top"
            value={description}
            onChangeText={setDescription}
            placeholder="Un court résumé..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
          />
        </View>

        <View className="h-10" />
      </ScrollView>

      {/* Footer */}
      <View className="p-5 border-t border-[#2d3139] bg-[#0d0f14]">
        <TouchableOpacity 
          className={`flex-row h-14 rounded-2xl items-center justify-center gap-2 bg-[#f97316] shadow-lg shadow-[#f97316]/30 ${isUploading ? 'opacity-70' : ''}`}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Upload size={20} color="#fff" />
              <Text className="text-white text-base font-bold">Confirmer & Envoyer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Label({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2">
      {icon}
      <Text className="text-[#94a3b8] text-sm font-semibold">{text}</Text>
    </View>
  );
}
