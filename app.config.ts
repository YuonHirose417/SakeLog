import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json を読み込み、環境変数から取る値だけを足す。
 *
 * 静的な設定（bundleIdentifier / plugins / eas.projectId など）は app.json に残しているので、
 * ここでは ...config を展開してそのまま引き継ぐこと。書き写すと projectId を落とす事故になる。
 *
 * 注意: EAS Build はローカルの .env を読まない。
 * 本番ビルドでキーを空にしないよう、EAS 側にも環境変数を登録すること（README 参照）。
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'SakeLog',
  slug: config.slug ?? 'sakelog',
  extra: {
    ...config.extra,
    revenueCat: {
      iosApiKey: process.env.REVENUECAT_IOS_API_KEY ?? '',
      androidApiKey: process.env.REVENUECAT_ANDROID_API_KEY ?? '',
    },
  },
});
