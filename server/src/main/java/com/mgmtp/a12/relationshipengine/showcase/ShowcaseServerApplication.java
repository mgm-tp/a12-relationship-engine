package com.mgmtp.a12.relationshipengine.showcase;

import com.mgmtp.a12.dataservices.DataServicesApplication;
import com.mgmtp.a12.dataservices.configuration.DataServicesCoreProperties;
import org.springframework.boot.SpringApplication;

@DataServicesApplication(scanBasePackages = { DataServicesCoreProperties.DS_PACKAGE_PREFIX, "com.mgmtp.a12.relationshipengine.showcase" })
public class ShowcaseServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShowcaseServerApplication.class, args);
    }
}
