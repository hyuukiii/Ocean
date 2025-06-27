package com.example.ocean.entity;


import jakarta.persistence.*;
import lombok.*;

import java.sql.Timestamp;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Place2 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // ID 자동 생성 전략
    private Long id; // 기본 키 필드

    private String place_name;
    private String place_id;
    private String address_name;
    private double lat;
    private double lng;
    private Timestamp created_at;

    public Place2(String place_name, String place_id, String address_name, double lat, double lng, Timestamp created_at) {
        this.place_name = place_name;
        this.place_id = place_id;
        this.address_name = address_name;
        this.lat = lat;
        this.lng = lng;
        this.created_at = created_at;
    }


}
