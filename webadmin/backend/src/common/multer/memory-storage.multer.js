import multer from "multer";

const memoryStorage = multer.memoryStorage();

const uploadMemoryStorage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/));
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
    }
  },
});

export { uploadMemoryStorage };
