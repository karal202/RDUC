export const testMiddleware = (req, res, next) => {
    console.log("middleware 1");
    // xử lý logic -> A
    const resultA = "Kết quả A";
    res.payload = resultA; // gán kết quả A vào res.payload để truyền cho middleware tiếp theo sử dụng
    next(); // gọi next để tiếp tục chạy middleware tiếp theo, nếu không có sẽ bị treo ở middleware hiện tại
  }