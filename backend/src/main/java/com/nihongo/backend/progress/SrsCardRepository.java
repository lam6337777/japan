package com.nihongo.backend.progress;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SrsCardRepository extends JpaRepository<SrsCard, Long> {

    List<SrsCard> findByUserId(Long userId);

    List<SrsCard> findByUserIdAndItemIdIn(Long userId, Collection<String> itemIds);
}
