package com.example.ocean.entity;


import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.sql.Timestamp;

@Entity
@Table(name = "PLACE")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Place {

    private String place_name;
    private String place_id;
    private String address_name;
    private double lat;
    private double lng;
    private Timestamp created_at;


}
