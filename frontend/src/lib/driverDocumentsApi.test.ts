import {afterEach,describe,expect,it,vi} from "vitest";
import {driverDocumentsApi} from "./driverDocumentsApi";

afterEach(()=>vi.restoreAllMocks());
const response=()=>Promise.resolve(new Response(JSON.stringify({status:"success",data:{verification:{status:"PENDING"}}}),{status:200,headers:{"Content-Type":"application/json"}}));

describe("driverDocumentsApi",()=>{
  it("uploads customer files as multipart form data",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(response);
    const form=new FormData();form.append("licenceExpiry","2030-01-01");
    await driverDocumentsApi.upload(form);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/users/me/driver-documents");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({method:"PATCH",body:form});
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string,string>)["Content-Type"]).toBeUndefined();
  });
  it("sends an explicit reviewer decision",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(response);
    await driverDocumentsApi.review("customer-id","REJECTED","Expired licence");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/users/customer-id/driver-documents/review");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({method:"PATCH",body:JSON.stringify({status:"REJECTED",rejectionReason:"Expired licence"})});
  });
});
