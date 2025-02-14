console.log("Hello Autoencoder 🚂");

import * as tf from "@tensorflow/tfjs-node";
import Jimp from "jimp";
import numeral from "numeral";

//size of images
const W = 28;
// variable for # of colors:  1 for greyscale and 3 for color
const c = 3;

//const images = await loadImages(5);
//const images = await loadImageAsTensor(5);

main();

async function main() {
  // Build the model
  const {
    decoderLayers,
    autoencoder
  } = buildModel();
  // load all image data
  const images = await loadImages(50);

  // train the model

  //Error: tensor4d() requires values to be number[][][][] or flat/TypedArray
  const x_train = tf.tensor4d(images.slice(0, 40), [40, W, W, c]);

  //last parameter is number of epochs
  await trainModel(autoencoder, x_train, 5);
  const saveResults = await autoencoder.save("file://public/model/");

  console.log(autoencoder.summary());

  //const autoencoder = await tf.loadLayersModel("file://public/model/model.json");
  // test the model
  const x_test = images.slice(40);
  //const x_test = tf.tensor4d(images.slice(50), [1, W, W, c]);
  await generateTests(autoencoder, x_test);

  // Create a new model with just the decoder
  const decoder = createDecoder(decoderLayers);
  const saveDecoder = await decoder.save("file://public/decoder/model/");
}

async function generateTests(autoencoder, x_test) {
  const output = autoencoder.predict(x_test);

  //original code
  // const newImages = await output.array();
  // for (let i = 0; i < newImages.length; i++) {
  //   const img = newImages[i];

  // image files identical??? something must be wrong
  //console.log(img);
  // const buffer = [];
  // for (let n = 0; n < img.length; n++) {

  //   const val = Math.floor(img[n] * 255);
  //   buffer[n * 4 + 0] = val;
  //   buffer[n * 4 + 1] = val;
  //   buffer[n * 4 + 2] = val;
  //   buffer[n * 4 + 3] = 255;
  // }

  //new code getting r,g,b values
  // const newImages = await output.array();
  // for (let i = 0; i < newImages.length; i++) {
  //   const img = newImages[i];
  //   const buffer = [];
  //   for (let n = 0; n < img.length; n++) {
  //     buffer[n * 4 + 0] = Math.round(img[n * c + 0] * 255);
  //     buffer[n * 4 + 1] = Math.round(img[n * c + 1] * 255);
  //     buffer[n * 4 + 2] = Math.round(img[n * c + 2] * 255);
  //     buffer[n * 4 + 3] = 255;  
  // } 

  // 
  const newImages = await output.array();
  for (let i = 0; i < 1; i++) { //newImages.length; i++) {
    const img = newImages[i];
    const buffer = [];
    for (let n = 0; n < img.length; n++) {
      for (let cidx = 0; cidx < 3; cidx++) {
        buffer[n * 4 + cidx] = Math.round(img[n * c + cidx] * 255);
        buffer[n * 4 + 3] = 255;
      }
      console.log(buffer);
    }
  }
  const image = new Jimp({
      data: Buffer.from(buffer),
      width: W,
      height: W,
    },
    (err, image) => {
      const num = numeral(i).format("0000");
      image.write(`output/shape${num}.png`);
    }
  );
}


function createDecoder(decoderLayers) {
  const decoder = tf.sequential();
  for (let layer of decoderLayers) {
    const newLayer = tf.layers.dense({
      units: layer.units,
      activation: layer.activation,
      inputShape: [layer.kernel.shape[0]],
    });
    decoder.add(newLayer);
    newLayer.setWeights(layer.getWeights());
  }
  // const learningRate = 0.000001;
  // const optimizer = tf.train.adam(learningRate);
  decoder.compile({
    optimizer: "adam",
    loss: "meanSquaredError",
  });
  return decoder;
}

function buildModel() {
  const autoencoder = tf.sequential();
  // Build the model

  // Encoder

  //! Commnet out the following code for greyscale images
  autoencoder.add(tf.layers.conv2d({
    inputShape: [W, W, c],
    // we are adding number of colors last
    dataFormat: 'channelsLast',
    kernelSize: 3,
    filters: 3, // recommended 3 because there are 3 colors
    activation: 'relu'
  }));

  //autoencoder.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));

  // the input into a dense layer must be a 1d array 
  autoencoder.add(tf.layers.flatten({}));

  //  !!Uncomment the following lines if you are using grey scale images
  // autoencoder.add(
  //   tf.layers.dense({
  //     units: 256*c,
  //     //inputShape: [ W*W*c ],
  //     activation: "relu",
  //   })
  // );
  // autoencoder.add(
  //   tf.layers.dense({
  //     units: 128*c,
  //     activation: "relu",
  //   })
  // );

  // autoencoder.add(
  //   tf.layers.dense({
  //     units: 64*c,
  //     activation: "relu",
  //   })
  // );
  autoencoder.add(
    tf.layers.dense({
      units: 16 * c,
      activation: "relu",
    })
  );
  autoencoder.add(
    tf.layers.dense({
      units: 4 * c,
      activation: "sigmoid",
    })
  );
  // // How do I start from here?
  // // Decoder

  let decoderLayers = [];
  decoderLayers.push(
    tf.layers.dense({
      units: 16 * c,
      activation: "relu",
    })
  );
  decoderLayers.push(
    tf.layers.dense({
      units: 64 * c,
      activation: "relu",
    })
  );
  decoderLayers.push(
    tf.layers.dense({
      units: 128 * c,
      activation: "relu",
    })
  );
  decoderLayers.push(
    tf.layers.dense({
      units: 256 * c,
      activation: "relu",
    })
  );
  decoderLayers.push(
    tf.layers.dense({
      units: W * W * c,
      activation: "sigmoid",
    })
  );

  for (let layer of decoderLayers) {
    autoencoder.add(layer);
  }
  // const learningRate = 0.001;
  // const optimizer = tf.train.adam(learningRate);
  autoencoder.compile({
    optimizer: "adam",
    loss: "meanSquaredError",
  });
  return {
    decoderLayers,
    autoencoder
  };
}

async function trainModel(autoencoder, x_train, epochs) {
  await autoencoder.fit(x_train, x_train, {
    epochs: epochs,
    batch_size: 32,
    shuffle: true,
    verbose: true,
  });
}

// load images of shapes
async function loadImages(total) {
  const allImages = [];
  let rawData = [];
  for (let i = 0; i < total; i++) {
    const num = numeral(i).format("0000");
    const img = await Jimp.read(
        `public/data/shape${num}.png`)
      .then(img => {
        return img
        //.write('color.jpg');
      })
      .catch(err => {
        console.error(err);
      });

    //strategy 1:  based on your original code
    let rawData = [];
    let rbit = [];
    let gbit = [];
    let bbit = [];
    for (let n = 0; n < W * W; n++) {
      let index = n * 4;
      let r = img.bitmap.data[index + 0];
      let g = img.bitmap.data[index + 1];
      let b = img.bitmap.data[index + 2];
      //normalize data
      rbit[n] = r / 255.0;
      gbit[n] = g / 255.0;
      bbit[n] = b / 255.0;

      // add each color array to rawData
      rawData.push(rbit);
      rawData.push(gbit);
      rawData.push(bbit);
    }
    allImages[i] = rawData;
    //console.log(rawData.length);  //get 2352
  }
  console.log(allImages.length); //getting batch size
  return allImages;
}
//   //strategy 2:  slight modification; try casting to tensors and stacking
//   let rawData = [];
//   let rbit = [];
//   let gbit = [];
//   let bbit = [];
//   for (let n = 0; n < W * W; n++) {
//   let index = n * 4;
//   let r = img.bitmap.data[index + 0];
//   let g = img.bitmap.data[index + 1];
//   let b = img.bitmap.data[index + 2];
//   const shape = [W, W];

//   // get the following  Error: Based on the provided shape, [28,28],
//   // the tensor should have 784 values but has 1

//   rbit[n] = tf.tensor((r / 255.0), shape);
//  // console.log(rbit.length);  // get 784
//   console.log('shape:', rbit.shape);
//   // gbit[n] = tf.tensor(g / 255.0);
//   // bbit[n] = tf.tensor(b / 255.0);
//   // tf.stack(rbit, gbit, bbit);
//}

//     console.log(rawData.length);
//     allImages[i] = rawData;
//   }
//   console.log(allImages.length);
//   //must return allImages here!!
//   return allImages;
//   //console.log(tf.memory());
//  }
// }

// // strategy 3 I think this is based on code from tensorflow/tfjs-examples.git
//         async function loadImageAsTensor(total) {
//           const allImages = [];
//           let rawData = [];
//           for (let i = 0; i < total; i++) {
//             const num = numeral(i).format("0000");
//             const img = await Jimp.read(
//                 `public/data/shape${num}.png`)
//               .then(img => {
//                 return img
//                 //.write('color.jpg');
//               })
//             const buffer = tf.buffer([1, W, W, 3], 'float32');
//             img.scan(0, 0, W, W, function (x, y, index) {
//               buffer.set(img.bitmap.data[index], 0, y, x, 0);
//               buffer.set(img.bitmap.data[index + 1], 0, y, x, 1);
//               buffer.set(img.bitmap.data[index + 2], 0, y, x, 2);
//             });
//             rawData = tf.tidy(() => tf.image.resizeBilinear(
//               buffer.toTensor(), [W, W]).div(255));
//             console.log(rawData.length); // getting undefined
//           }
//         }

//     //strategy 4:  based on code in stack exchange
//     const values = img.bitmap.data;
//     const outShape = [1, img.bitmap.width, img.bitmap.height, 4];
//     let d = tf.tensor4d(values, outShape, 'float32');
//     // Slice away alpha
//     d = d.slice([0, 0, 0, 0], [1, img.bitmap.width, img.bitmap.height, c]);
//     rawData = d / 255.0;
//     allImages[i] = rawData;
//     //allImages.push(rawData) 
//     //console.log(rawData.length);
//     return allImages;
//     //console.log(allImages.length);
//   }
// }

//strategy 5:  input as one long tensor shape [batchsize, 1,2352]
// I don't think this is the right approach, however, as number of colors provides 
// important features??

// const p = [];
// for (let n = 0; n < W * W; n++) {
//   let idx = n * 4;
//   for (let cidx = 0; cidx < c; cidx++) {
//   let d = tf.tensor2d(img.bitmap.data[idx + cidx]);
//       p.push(img.bitmap.data[idx + cidx]);
//       rawData[n * c + cidx] = p[n * c + cidx] / 255.0;
//     }
//   }
//   console.log(rawData);

// allImages[i] = tf.tensor3d(rawData, [1, W * W * c]);
// rd = tf.tensor1d(rawData);
// allImages = tf.stack(rd);
// console.log(allImages[0]); 
//   }
//   return allImages;
// }