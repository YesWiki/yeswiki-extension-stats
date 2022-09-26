<?php

/*
 * This file is part of the YesWiki Extension stats.
 *
 * Authors : see README.md file that was distributed with this source code.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace YesWiki\Stats;

use YesWiki\Core\YesWikiHandler;
use YesWiki\Core\Service\AclService;
use YesWiki\Core\Service\PageManager;
use YesWiki\Stats\Service\StatsManager;

class IframeHandler__ extends YesWikiHandler
{
    public function run()
    {
        // get Services
        $aclService = $this->getService(AclService::class);
        $pageManager = $this->getService(PageManager::class);
        $statsManager = $this->getService(StatsManager::class);
        $tag = $this->wiki->getPageTag();
        if ($aclService->hasAccess('read', $tag) && !empty($pageManager->getOne($tag))) {
            $statsManager->registerStatsNotAdmin($tag);
        }
    }
}
