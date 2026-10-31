import { useMutation } from "@tanstack/react-query";
import type { PresignRequest } from "api";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, Text, View } from "react-native";

import { Choice, SectionTitle, Step } from "../../components/step";
import { type Photo, useDraft } from "../../draft";
import { errorMessage } from "../../errors";
import i18n from "../../i18n";
import { uploadPhoto } from "../../upload";

export default function Photos() {
  const { t } = useTranslation();
  const { labelType, labelPhoto, packagePhoto, update } = useDraft();
  return (
    <Step title={t("photos.title")}>
      <PhotoSlot
        kind="label"
        title={t("photos.label")}
        hint={t(
          labelType === "qr_code" ? "photos.labelHintQr" : "photos.labelHint",
        )}
        photo={labelPhoto}
        onUploaded={(photo) => update({ labelPhoto: photo })}
      />
      <PhotoSlot
        kind="package"
        title={t("photos.package")}
        hint={t("photos.packageHint")}
        photo={packagePhoto}
        onUploaded={(photo) => update({ packagePhoto: photo })}
      />
    </Step>
  );
}

function PhotoSlot({
  kind,
  title,
  hint,
  photo,
  onUploaded,
}: {
  kind: PresignRequest["kind"];
  title: string;
  hint: string;
  photo: Photo | null;
  onUploaded: (photo: Photo) => void;
}) {
  const { t } = useTranslation();
  const pick = useMutation({
    mutationFn: async (source: "camera" | "library") => {
      const draft = useDraft.getState().id;
      if (source === "camera") {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) throw { detail: i18n.t("photos.cameraDenied") };
      }
      const launch =
        source === "camera"
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;
      // quality < 1 re-compresses, which keeps phone photos under the API's 10 MB limit.
      const result = await launch({ mediaTypes: ["images"], quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const key = await uploadPhoto(kind, asset);
      // Saved here, not in a callback, so it lands even if the screen has closed, unless
      // a new return was started meanwhile.
      if (useDraft.getState().id === draft) onUploaded({ key, uri: asset.uri });
    },
  });
  return (
    <View className="gap-3">
      <SectionTitle>{title}</SectionTitle>
      <Text className="font-sans text-base text-muted">{hint}</Text>
      {photo && (
        <View className="flex-row items-center gap-3">
          <Image
            source={{ uri: photo.uri }}
            accessibilityIgnoresInvertColors
            className="h-20 w-20 rounded-sm"
          />
          <Text className="font-sans-semibold text-base text-ink">
            {t("photos.uploaded", { photo: title })}
          </Text>
        </View>
      )}
      {pick.isPending && <ActivityIndicator />}
      {pick.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(pick.error)}
        </Text>
      )}
      <Choice
        label={t("photos.camera")}
        accessibilityLabel={t("photos.cameraFor", { photo: title })}
        disabled={pick.isPending}
        onPress={() => pick.mutate("camera")}
      />
      <Choice
        label={t("photos.library")}
        accessibilityLabel={t("photos.libraryFor", { photo: title })}
        disabled={pick.isPending}
        onPress={() => pick.mutate("library")}
      />
    </View>
  );
}
