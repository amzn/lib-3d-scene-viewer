import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import CompressionPlugin from 'compression-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (env, argv) => {
    const isProd = env.production;

    const plugins = [
        new HtmlWebpackPlugin({
            template: './src/dev/viewer.html',
            filename: (entryName) => `${entryName}.html`,
        }),
        new CompressionPlugin(),
    ];

    if (isProd) {
        plugins.push(
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
            }),
        );
    }

    return {
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'eval-cheap-module-source-map',
        entry: {
            index: './src/index.ts',
            viewerIndex: './src/dev/index.ts',
            v3dViewer: './src/dev/v3dViewer.ts',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
        },
        resolve: {
            extensions: ['.tsx', '.js', '.ts'],
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
                {
                    test: /\.(png|svg|jpg|gif|gltf|bin|env|peg|woff|woff2|eot|ttf)$/,
                    use: ['file-loader'],
                },
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                },
            ],
        },
        devServer: {
            static: {
                directory: path.resolve(__dirname, 'public'),
                publicPath: '/public',
            },
            compress: false,
            open: 'viewerIndex',
            port: 8443,
            server: 'http',
            hot: true,
            liveReload: true,
            historyApiFallback: false,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        },
        plugins: plugins,
    };
};
