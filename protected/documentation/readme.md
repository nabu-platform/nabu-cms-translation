Conclusie: nieuwe $translation root om alle projecten in te beheren. Zo mogelijk deur open houden voor custom root. 


# Flow

Someone creates a new project. That particular permissions is only given to managers by default, but can be assigned to other people.
Each project has a project manager (the person who created it originally) and can assign other project managers.
Additionally they can invite "members" to the project.

Then the project manager creates new bundles. For each bundle he can assign people from the member pool to have specific roles (e.g. translator,...)


The translation bundle is where we manage security of who can alter which translations.
A translation bundle can have attachments (e.g. screenshots) that help understand it.

## Two modes

This project has two modes of operation:

- embedded
- standalone

In the embedded case, we assume it is running on the server where it is being used. In that case "environments" are less relevant though they can still be used to detect hotfixes (that likely need backporting).
Releases are also less relevant in the embedded version because the build system provides release stability: you will include the latest verified translations in the build, which will be stable between environments.

In a standalone version, environments and on which release each environment is, becomes crucial to providing a stable experience.

## Feedback

A translator might want feedback on a term (e.g. there is not enough contextual information)
Or a reviewer might have feedback on a particular translated item.

The log type is used to mark it, for instance "clarifyContext" could be a type. Once done, it can be ticked off.

## Versioning

Versioning is "time based". We keep track of when terms are created and deprecated.
We keep track of when translations are created (not all that important), verified and deprecated. The translation is active between verification and deprecation.

An alternative to time based versioning is snapshot-based where we make a snapshot of all active translations at the time of version creation.
The advantages of this are faster lookup and a local copy you can tweak. The disadvantage is a LOT of duplication. Especially for mature projects, most translations won't change often but release cycles might continue at a frequent pace.
Additionally local copies have the downside of not being upstreamed to the "latest" version that is currently being worked on and makes it harder for people to understand why a particular change is not reflected anywhere.

We want predictability of a release, if you release a particular version of software to qlty, you want to test it there for a while. If two weeks later you proceed with a production deployment, you want the same translations.
So while time is relevant, we want to link it to a particular version that moves between environments. If there a significant enough delay between environmental builds, prd might not contain the same translation data as qlty which is not what you want. 

When a particular API key from a particular environment requests read access to the translations, they can proactively send along a "released" date.
Alternatively you can make it part of your release cycle to automatically release an environment.

Because releases are time based, we can calculate the resulting translation file based on the 

## Hotfixing

In a lot of cases translations problems are detected in qlty (or sometimes even in prd). This means we have to update a particular "version" to get to a more stable release without getting all the new translations involved.
We assume that a hotfix ALSO applies to the latest version, which means you actually update (or create) a new "latest" version but can apply it as a hotfix to a particular historic version (select it based on the releases)
At that time we make a new entry for the historic entry, disable the original one and activate the new one. We still have full history at that point.

Hotfixing is the most powerful permission (even more powerful than validation) because it allows you to change an active production environment.

If the hotfix has to go through a translator, you can add a comment with the hotfixRequired log type.

## Stages

Your application likely has different stages (initial load, registration wizard,...). You "could" just load all translations at the start but that might be too bulky.
You can choose a logical name for the stage and (from the application) only request a particular stage to be loaded.

Stages are too complicated to manage efficiently across thousands of translations. You could consider bulk editing, but new terms would not automatically have the bulk editing applied unless you switched to a rule based system.
At that point however, complexity (both of maintenance, building and understanding) becomes too great.

Instead, use bundles if you want to differentiate, you could create a bundle "copy" which contains all the copy to your site or a bundle "initial copy" to be loaded initially or ...

## Operational data

Operational translations are linked to their respective environments, so a blog article made directly in prd will not have translations in dev.
Operational translations are assumed to be linked to a unique identifier with the key as the qualifier of what it is (for instance a uuid to point to a record and the key is the field being translated).
Operational data is handled differently because (over time) it can become quite voluminous. It is not assumed to be batch loaded at a particular stage.

## Roles

You can invite people at the project level to generally participate in a certain role.

- Project Manager: can manage user permissions, invite people etc. either at the project level or the bundle level
	- people can only be invited at project level, then assigned bundle(s)
	- can create bundles
- Member: read-only access unless specifically stated otherwise, so for instance everyone who works only on one bundle is a guest at the project level
- Participant: can add terms etc, post comments etc
- Reviewer: can validate translations
- Translator: can provide translations (so a translator)


The last three roles all have "translationBundle.list" permission because by adding that permission you can see the bundle. We don't want a dedicated "bundle participant" role for this and we can't add it to "member" because then you would always have it on all bundles.


## Webhooks

We use webhooks to feedback information from say qlty to dev.
When we validate, hotfix,... we can call webhooks with that information.

# Indexes

Unique constraint:

```
ALTER TABLE translation_terms ADD CONSTRAINT term_unique UNIQUE nulls not distinct (term, translation_bundle_id, instance_id)
```