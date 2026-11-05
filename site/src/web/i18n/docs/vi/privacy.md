---
title: Quyền riêng tư và rút khỏi bảng xếp hạng
description: contributor.top dùng dữ liệu gì và cách để được gỡ khỏi bảng xếp hạng.
---

# Quyền riêng tư và rút khỏi bảng xếp hạng

## Chúng tôi dùng gì

Chỉ dữ liệu công khai từ hồ sơ GitHub: ID tài khoản dạng số, tên đăng nhập, số người theo dõi và số đóng góp trong 12 tháng qua của bạn. Chúng tôi không lưu tên hiển thị, email, tiểu sử, công ty, trạng thái hay nguyên văn vị trí của bạn. Dữ liệu không được bán và không được chia sẻ với nhà tuyển dụng hay trang việc làm.

## Tự gỡ mình khỏi bảng xếp hạng

Đặt trạng thái GitHub của bạn thành một thông điệp có chứa `contributor.top opt-out`, hiển thị với mọi người, với "Clear after: Don't clear". Bạn sẽ bị gỡ khỏi mọi bảng xếp hạng và huy hiệu vào lần cập nhật kế tiếp của quốc gia bạn (trong khoảng hai ngày); nếu việc cập nhật quốc gia của bạn liên tục thất bại, trạng thái vẫn được kiểm tra ở đầu mỗi lần chạy trình thu thập. Sau đó bạn có thể xóa trạng thái; việc rút lui vẫn được giữ nguyên.

Chúng tôi cố ý không có biểu mẫu hay issue nào để điền: một yêu cầu công khai sẽ gắn tên đăng nhập của bạn với việc gỡ bỏ mãi mãi. Trạng thái không cần bạn liên hệ với chúng tôi và chỉ được đọc từ hồ sơ của chính bạn, nên không ai có thể gỡ hay thêm người khác.

Chúng tôi chỉ giữ một hash có khóa của ID tài khoản để bạn không bị thêm lại, trong một danh sách được mã hóa và được mã hóa lại ở mỗi lần chạy: từ danh sách đó không thể biết ai, bao nhiêu người đã rút lui, hay vào lúc nào. Để quay lại, hãy đặt trạng thái có chứa `contributor.top opt-in`.

## Những gì chúng tôi không kiểm soát được

Các bản sao được tạo trước khi gỡ: commit cũ của repository công khai, kho lưu trữ web, fork và bộ nhớ đệm của công cụ tìm kiếm. Bất kỳ ai so sánh các bảng xếp hạng theo thời gian đều có thể thấy bạn không còn trong danh sách, giống như với bất kỳ ai chuyển đi hoặc rơi khỏi top. Ảnh đại diện được tải từ máy chủ của GitHub, và mỗi trang hỏi API của GitHub số sao của repository, nên GitHub thấy địa chỉ IP của người truy cập. Trang web không dùng công cụ phân tích và không dùng cookie.

## Liên hệ

Câu hỏi về trang này: [mở một issue](https://github.com/contributor-top/contributor.top/issues).
