import multer from 'multer';

const diskStorage = multer.diskStorage({
  destination: '/tmp/school-administration-system-uploads',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

const upload = multer({ storage: diskStorage });

export default upload;
