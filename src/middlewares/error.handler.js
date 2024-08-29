function errorHandler(errName, req, res) {
  switch (errName) {

    case'CheckInputData':
      return  res.status(400).send({
        errorMessage: '입력값을 확인해주세요.',
      });
    case 'Forbidden':
      return res.status(403).send({
        errorMessage: '권한이 없습니다.',
      });
    case 'ProductNotFound':
      return res.status(404).send({
        errorMessage: '상품이 없습니다.',
      });


    case 'CheckDBConnect':
      return res.status(500).send({
        errorMessage: 'DB를 확인해주세요.',
      });

    default:
      return res.status(500).send({
        errorMessage: 'Error Occurred',
      });
  }
}

module.exports = {
  errorHandler,
};