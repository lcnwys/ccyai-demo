开放 API 接口文档
一、鉴权说明
除放行路径外，请求须携带以下请求头，并使用 SecretKey 对「待签名字符串」做 HMAC-SHA256 后
Base64URL 编码得到 `X-Signature`。时间戳有效期为 300 秒，Nonce 防重放。（当前支持JAVA工具
类）
请求头 说明 必填
X-Access-Key 接入方 AccessKey 是
X-Timestamp 当前时间戳（秒） 是
X-Nonce 随机串，防重放 是
X-Signature HMAC-SHA256(Base64URL) 签名 是
服务地址： `https://api.chcyai.com`
其他说明：
“文档中所有代码样例采用okhttp3作为测试, 如使用Maven可直接复制以下依赖”
<dependency>
 <groupId>com.squareup.okhttp3</groupId>
 <artifactId>okhttp</artifactId>
 <version>4.12.0</version>
</dependency>
二、SignatureGenUtil（Java）
https://markdowntoimage.cn  ·  1 / 20
package lnx.CCYServerOpenApiPlatform.utils;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
public class SignatureGenUtil {
 public static String nonce(int bytes) {
 byte[] b = new byte[bytes];
 new SecureRandom().nextBytes(b);
 return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
 }
 public static String timestamp() {
 return String.valueOf(System.currentTimeMillis() / 1000);
 }
 public static String sha256Hex(String s) {
 try {
 MessageDigest md = MessageDigest.getInstance("SHA-256");
 byte[] dig = md.digest(s.getBytes(StandardCharsets.UTF_8));
 StringBuilder sb = new StringBuilder(dig.length * 2);
 for (byte x : dig) sb.append(String.format("%02x", x));
 return sb.toString();
 } catch (Exception e) { throw new RuntimeException(e); }
 }
 public static String canonicalQuery(Map<String, String> query) {
 if (query == null || query.isEmpty()) return "";
 return query.entrySet().stream()
 .sorted(Map.Entry.comparingByKey())
 .map(e -> urlEncode(e.getKey()) + "=" + urlEncode(e.getValue()))
 .reduce((a, b) -> a + "&" + b)
 .orElse("");
 }
 private static String urlEncode(String s) {
https://markdowntoimage.cn  ·  2 / 20
 try {
 String r = java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
 return r.replace("+", "%20").replace("*", "%2A").replace("%7E", "~");
 } catch (Exception e) { throw new RuntimeException(e); }
 }
 public static String hmacSha256Base64Url(String secretKey, String data) {
 try {
 Mac mac = Mac.getInstance("HmacSHA256");
 mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), 
"HmacSHA256"));
 byte[] sig = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
 return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
 } catch (Exception e) { throw new RuntimeException(e); }
 }
 public static String buildPath(String template, Map<String, String> params) {
 String path = template;
 for (Map.Entry<String, String> entry : params.entrySet())
 path = path.replace("{" + entry.getKey() + "}", entry.getValue());
 return path;
 }
 public static String buildStringToSign(String method, String path,
 Map<String, String> query, String body, String timestamp, String nonce) {
 String q = canonicalQuery(query);
 String bodyHash = sha256Hex(body == null ? "" : body);
 return method.toUpperCase(Locale.ROOT) + "\n" + path + "\n" + q + "\n"
 + bodyHash + "\n" + timestamp + "\n" + nonce;
 }
}
三、通用响应结构
成功:
层级 字段名 类型 说明
— data Object 业务数据，具体见各接口
https://markdowntoimage.cn  ·  3 / 20
层级 字段名 类型 说明
— requestId String 请求标识/任务 ID
— status String EXECUTE_SUCCESS / EXECUTE_ERROR
失败：
层级 字段名 类型 说明
— error Object 错误信息（含 code、success 等）
— requestId String 请求标识
— status String EXECUTE_ERROR
四、 类型信息
比例类型 (aspectRatioId):
类型 说明
0 1:1
1 4:3
2 3:4
3 4:5
4 5:4
5 9:16
6 16:9
7 21:9
分辨率类型 (resolutionRatioId):
https://markdowntoimage.cn  ·  4 / 20
类型 说明
0 1K
1 2K
2 4K
五、接口明细
4.1 上传文件
方法： POST
路径： `/v1/files/uploads`
Content-Type： `multipart/form-data`（表单字段名：`file`）
请求参数（表单）
层级 字段名 类型 必填 说明
— file MultipartFile 是 文件二进制
响应参数 （200 OK）
层级 字段名 类型 说明
— data String 上传成功后的 fileId（用于下载接口）
— requestId String 请求标识
— status String 状态
代码示例
import com.alibaba.fastjson.JSON;
import lnx.CCYServerOpenApiPlatform.entity.ApiSuccess;
import lnx.CCYServerOpenApiPlatform.utils.SignatureGenUtil;
import okhttp3.*;
https://markdowntoimage.cn  ·  5 / 20
import java.io.File;
import java.io.IOException;
import java.util.Map;
public static void main(String[] args) throws Exception {
 File file = new File("D:\\xxx\\微信图片_2026-03-04_154112_111.jpg")
 String method = "POST";
 String path = "/v1/files/uploads";
 String url = "服务地址" + path;
 String timestamp = SignatureGenUtil.timestamp();
 String nonce = SignatureGenUtil.nonce(12);
 String stringToSign = SignatureGenUtil.buildStringToSign(method, path, null, 
null, timestamp, nonce);
 String signature = hmacSha256Base64Url(SECRET_KEY, stringToSign);
 OkHttpClient client = new OkHttpClient();
 RequestBody fileBody = RequestBody.create(
 file,
 MediaType.parse("application/octet-stream")
 );
 MultipartBody requestBody = new MultipartBody.Builder()
 .setType(MultipartBody.FORM)
 .addFormDataPart(
 "file",
 file.getName(),
 fileBody
 )
 .build();
 Request request = new Request.Builder()
 .url(url)
 .post(requestBody)
 .addHeader("X-Access-Key", ACCESS_KEY)
 .addHeader("X-Timestamp", timestamp)
 .addHeader("X-Nonce", nonce)
 .addHeader("X-Signature", signature)
 .build();
 Response response = client.newCall(request).execute();
https://markdowntoimage.cn  ·  6 / 20
 String responseBody = response.body().string();
 System.out.println("HTTP CODE: " + response.code());
 System.out.println("Response Body: " + responseBody);
}
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
业务错误码
状态码 错误码(code) 说明
401 FILE_NOT_EXIST 文件不存在
401 FILE_SIZE_ERROR 文件超出(最大不能超出5M)
401 FORMAT_ERROR 上传文件格式错误
4.2 获取文件下载地址
方法： GET
路径： `/v1/files/downloads/{fileId}`
路径参数
https://markdowntoimage.cn  ·  7 / 20
层级 字段名 类型 必填 说明
— fileId String 是 文件 ID（上传接口返回的 data）
响应参数 (200 OK)
层级 字段名 类型 说明
— data String 临时下载 URL
— requestId String 请求标识
— status String 状态
代码示例
public static void main(String[] args) throws Exception {
String method = "GET";
 String path = "/v1/files/downloads/{fileId}";
 String url = "服务地址";
 String timestamp = SignatureGenUtil.timestamp();
 String nonce = SignatureGenUtil.nonce(12);
 Map<String, String> query = Map.of("fileId", fileId);
 String newPath = SignatureGenUtil.buildPath(path, query);
 url += newPath;
 String stringToSign = SignatureGenUtil.buildStringToSign(method, newPath,
query, null, timestamp, nonce);
 String signature = hmacSha256Base64Url(SECRET_KEY, stringToSign);
 OkHttpClient client = new OkHttpClient();
 Request request = new Request.Builder()
 .url(url)
 .addHeader("X-Access-Key", ACCESS_KEY)
 .addHeader("X-Timestamp", timestamp)
 .addHeader("X-Nonce", nonce)
 .addHeader("X-Signature", signature)
 .build();
 try (Response response = client.newCall(request).execute()) {
https://markdowntoimage.cn  ·  8 / 20
 String responseBody = response.body().string();
 System.out.println("HTTP CODE: " + response.code());
 System.out.println("Response Body: " + responseBody);
}
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
4.3 创建生图任务
方法： POST
路径： `/v1/images/generations`
Content-Type： `application/json`
请求参数
层级 字段名 类型 必填 说明
— callbackUrl string 是 回调地址(执行完后可通过该地址通知结果)
— referenceImageIdList List<String> 否 参考图 ID 列表，最多 6 个
— prompt String 是 用户提示词
— aspectRatioId Integer 否 比例（详细可见类型信息）
— resolutionRatioId Integer 是 分辨率选项（详细可见类型信息）
https://markdowntoimage.cn  ·  9 / 20
层级 字段名 类型 必填 说明
— fileName String 否 文件名称
响应参数 (200 OK)
层级 字段名 类型 说明
— data String 任务 ID（taskId），用于查询结果
— requestId String 请求标识
— status String 多为 EXECUTE
代码示例
private static final String ACCESS_KEY = "AK_xxxx";
private static final String SECRET_KEY = "SK_xxxx";
private static final OkHttpClient CLIENT = new OkHttpClient();
public static void main(String[] args) throws Exception {
 String method = "POST";
 String path = "/v1/images/generations";
 String url = "http://服务地址" + path;
 Generate generate = new Generate();
 generate.setPrompt("帮我生成一张可爱的宝宝");
 generate.setAspectRatioId(0);
 generate.setResolutionRatioId(0);
 generate.setCallbackUrl("回调地址");
 String body = JSON.toJSONString(generate);
 String timestamp = SignatureGenUtil.timestamp();
 String nonce = SignatureGenUtil.nonce(12);
 String stringToSign = SignatureGenUtil.buildStringToSign(
 method,
 path,
 null,
 body,
https://markdowntoimage.cn  ·  10 / 20
 timestamp,
 nonce
 );
 String signature = hmacSha256Base64Url(SECRET_KEY, stringToSign);
 RequestBody requestBody = RequestBody.create(
 body,
 MediaType.parse("application/json; charset=utf-8")
 );
 Request request = new Request.Builder()
 .url(url)
 .post(requestBody)
 .addHeader("Content-Type", "application/json")
 .addHeader("X-Access-Key", ACCESS_KEY)
 .addHeader("X-Timestamp", timestamp)
 .addHeader("X-Nonce", nonce)
 .addHeader("X-Signature", signature)
 .build();
 try (Response response = CLIENT.newCall(request).execute()) {
 System.out.println("HTTP CODE: " + response.code());
 String responseBody = response.body() != null
 ? response.body().string()
 : "";
 System.out.println("Response Body: " + responseBody);
 }
}
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
https://markdowntoimage.cn  ·  11 / 20
状态码 错误码(code) 说明
400 INVALID_SIGNATURE 签名错误
402 INSUFFICIENT_BALANCE 余额不足
4.4 查询生图任务结果
方法： GET
路径： `/v1/images/info/{taskId}`
路径参数
层级 字段名 类型 必填 说明
— taskId String 是 创建任务时返回的 data
响应参数 (200 OK)
层级 字段名 类型 说明
— data Object 见下表
data generateImageId String 生成图 ID
data deductibleAmount BigDecimal 扣费金额
— requestId String 请求标识
— status String 状态
业务错误码
状态码 错误码(code) 说明
404 TASK_NOT_EXIST 任务不存在
代码示例
private static final String ACCESS_KEY = "AK_xxx";
 private static final String SECRET_KEY = "SK_xxx";
https://markdowntoimage.cn  ·  12 / 20
 public static void main(String[] args) throws Exception {
 String method = "GET";
 String path = "/v1/images/info/{taskId}";
 String timestamp = SignatureGenUtil.timestamp();
 String nonce = SignatureGenUtil.nonce(12);
 // 自动替换 path
 Map<String, String> query = Map.of("taskId", "内容值");
 String newPath = SignatureGenUtil.buildPath(path, query);
 String url = "http://服务地址" + newPath;
 String stringToSign = SignatureGenUtil.buildStringToSign(method, newPath,
query, null, timestamp, nonce);
 String signature = hmacSha256Base64Url(SECRET_KEY, stringToSign);
 OkHttpClient client = new OkHttpClient();
 Request request = new Request.Builder()
 .url(url)
 .addHeader("X-Access-Key", ACCESS_KEY)
 .addHeader("X-Timestamp", timestamp)
 .addHeader("X-Nonce", nonce)
 .addHeader("X-Signature", signature)
 .build();
 try (Response response = client.newCall(request).execute()) {
 String responseBody = response.body().string();
 System.out.println("HTTP CODE: " + response.code());
 System.out.println("Response Body: " + responseBody);
 System.out.println(responseBody);
 }
 }
说明:
https://markdowntoimage.cn  ·  13 / 20
“后续接口请求方式与以上示例基本一致”
4.5 生成打印图
方法： POST
路径： `/v1/prints/generations`
Content-Type： `application/json`
请求参数
层级 字段名 类型 必填 说明
— callbackUrl String 是 回调地址
— fileName String 否 文件名称
— referenceImageId String 否 参考图 ID
— dpi Integer 是 DPI(0-1200)
— selectedArea Object 否 裁剪区域
selectedArea cropX Integer 否 裁剪左上角 X
selectedArea cropY Integer 否 裁剪左上角 Y
selectedArea cropW Integer 否 裁剪宽度
selectedArea cropH Integer 否 裁剪高度
— imageHeight Integer 是 图片高度
— imageWidth Integer 是 图片宽度
响应参数 (200 OK)
层级 字段名 类型 说明
— data String 任务 ID（taskId）
— requestId String 同 taskId
— status String EXECUTE
https://markdowntoimage.cn  ·  14 / 20
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
402 INSUFFICIENT_BALANCE 余额不足
4.6 查询打印图任务结果
方法： GET
路径： `/v1/prints/info/{taskId}`
路径参数
层级 字段名 类型 必填 说明
— taskId String 是 创建打印图任务返回的 data
响应参数 (200 OK)
层级 字段名 类型 说明
— data Object 见下表
data generateImageId String 生成图 ID
data deductibleAmount BigDecimal 扣费金额
— requestId String 请求标识
— status String 状态
错误码
https://markdowntoimage.cn  ·  15 / 20
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
业务错误码
状态码 错误码(code) 说明
404 TASK_NOT_EXIST 任务不存在
4.7 创建印花提取任务
方法： POST
路径： `/v1/printing/generations`
Content-Type： `application/json`
请求参数
层级 字段名 类型 必填 说明
— callbackUrl String 是 回调地址
— prompt String 否 提示词
— referenceImageId String 是 原图 ID
— fileName String 否 文件名称
— resolutionRatioId Integer 是 分辨率，0–2 (详细见类型信息)
— isPatternCompleted Integer 是 0：否 1：是
https://markdowntoimage.cn  ·  16 / 20
响应参数 (200 OK)
层级 字段名 类型 说明
— data String 任务 ID（taskId）
— requestId String 请求标识
— status String EXECUTE
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
402 INSUFFICIENT_BALANCE 余额不足
4.8 查询印花提取任务结果
方法： GET
路径： `/v1/printing/info/{taskId}`
鉴权： 需要
路径参数
层级 字段名 类型 必填 说明
— taskId String 是 创建任务返回的 data
响应参数 (200 OK)
https://markdowntoimage.cn  ·  17 / 20
层级 字段名 类型 说明
— data Object generateImageId、deductibleAmount
— requestId String 请求标识
— status String 状态
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
业务错误码
状态码 错误码(code) 说明
404 TASK_NOT_EXIST 任务不存在
4.9 创建图裂变任务
方法： POST
路径： `/v1/fission/generations`
Content-Type： `application/json`
请求参数
层级 字段名 类型 必填 说明
— callbackUrl String 是 回调地址
https://markdowntoimage.cn  ·  18 / 20
层级 字段名 类型 必填 说明
— prompt String 否 提示词
— fileName String 否 文件名称
— referenceImageId String 是 参考图 ID
— similarity BigDecimal 是 相似度，0.01–1
— resolutionRatioId Integer 是 分辨率 （详细可见类型信息）
— aspectRatio Integer 是 比例（详细可见类型信息）
响应参数 (200 OK)
层级 字段名 类型 说明
— data String 任务 ID（taskId）
— requestId String 请求标识
— status String EXECUTE
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
402 INSUFFICIENT_BALANCE 余额不足
4.10 查询图裂变任务结果
方法： GET
https://markdowntoimage.cn  ·  19 / 20
路径： `/v1/fission/info/{taskId}`
路径参数
层级 字段名 类型 必填 说明
— taskId String 是 创建任务返回的 data
响应参数 (200 OK)
层级 字段名 类型 说明
— data Object generateImageId、deductibleAmount
— requestId String 请求标识
— status String 状态
错误码
公共错误码
状态码 错误码(code) 说明
401 PARAM_ERROR 参数错误
401 REQUEST_EXPIRED 请求过期
403 REPLAY_ATTACK 请求重复
400 INVALID_SIGNATURE 签名错误
业务错误码
状态码 错误码(code) 说明
404 TASK_NOT_EXIST 任务不存在
图片由 https://markdowntoimage.cn 生成
https://markdowntoimage.cn  ·  20 / 20